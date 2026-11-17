import express from "express";
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { Server } from "socket.io";
import { z } from "zod";
import { MonitoringSessionStore } from "./session-store.js";
import { SlidingWindowRateLimiter } from "./rate-limiter.js";

type CreateRwServerOptions = {
  serveWeb?: boolean;
  sessionSecret?: string | Uint8Array;
  now?: () => number;
};

const processSessionSecret = process.env.SESSION_SECRET?.trim() || randomBytes(32);
const opaqueIdSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const bearerTokenSchema = z.string().regex(/^Bearer [A-Za-z0-9_-]{43}$/);
const pairingBodySchema = z.object({
  inviteId: opaqueIdSchema,
  pin: z.string().regex(/^\d{6}$/)
}).strict();
const pairingJson = express.json({ limit: "1kb", strict: true });
const PAIRING_IP_LIMIT = 20;
const PAIRING_IP_WINDOW_MS = 5 * 60 * 1_000;
const VIEWER_COOKIE_NAME = "__Host-rw_viewer";
const VIEWER_COOKIE_MAX_AGE_SECONDS = 43_200;

export function createRwServer({
  serveWeb = false,
  sessionSecret = processSessionSecret,
  now
}: CreateRwServerOptions = {}) {
  const app = express();
  const sessionStore = new MonitoringSessionStore({ secret: sessionSecret, now });
  const pairingIpLimiter = new SlidingWindowRateLimiter({
    limit: PAIRING_IP_LIMIT,
    windowMs: PAIRING_IP_WINDOW_MS,
    now
  });
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Permissions-Policy", "camera=(self), microphone=(self)");
    next();
  });
  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api/monitoring-sessions", (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  app.post("/api/monitoring-sessions", (_request, response) => {
    response.status(201).json(sessionStore.create());
  });

  app.post("/api/monitoring-sessions/:sessionId/invite", (request, response) => {
    const credentials = cameraCredentials(request.params.sessionId, request.headers.authorization);
    if (!credentials) {
      unavailable(response);
      return;
    }

    const result = sessionStore.regenerateInvite(credentials.sessionId, credentials.cameraToken);
    if (result.status === "unavailable") {
      unavailable(response);
      return;
    }
    if (result.status === "rate_limited") {
      tooManyRequests(response, result.retryAfterSeconds);
      return;
    }

    response.status(201).json({ invite: result.invite });
  });

  app.delete("/api/monitoring-sessions/:sessionId", (request, response) => {
    const credentials = cameraCredentials(request.params.sessionId, request.headers.authorization);
    if (!credentials || !sessionStore.stop(credentials.sessionId, credentials.cameraToken)) {
      unavailable(response);
      return;
    }

    response.status(204).end();
  });

  app.post("/api/pairing", pairingJson, (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const rateLimit = pairingIpLimiter.consume(request.ip || request.socket.remoteAddress || "unknown");
    if (!rateLimit.allowed) {
      tooManyRequests(response, rateLimit.retryAfterSeconds);
      return;
    }
    const parsedBody = pairingBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      pairingUnavailable(response);
      return;
    }

    const paired = sessionStore.pair(parsedBody.data.inviteId, parsedBody.data.pin);
    if (!paired) {
      pairingUnavailable(response);
      return;
    }

    setViewerCookie(response, paired.sessionId, paired.viewerToken);
    response.json({ status: "paired" });
  });

  app.get("/api/viewer-session", (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const credentials = viewerCredentials(request.headers.cookie);
    if (
      !credentials ||
      !sessionStore.validateViewer(credentials.sessionId, credentials.viewerToken)
    ) {
      clearViewerCookie(response);
      response.status(401).json({ error: "Viewer session unavailable" });
      return;
    }

    response.json({ status: "paired" });
  });

  app.get("/api/turn-credentials/:sessionId", (request, response) => {
    const sessionId = request.params.sessionId;
    const camera = cameraCredentials(sessionId, request.headers.authorization);
    const viewer = viewerCredentials(request.headers.cookie);
    const authorized = camera
      ? sessionStore.authorizeSocket(sessionId, "camera", camera.cameraToken)
      : Boolean(viewer && viewer.sessionId === sessionId && sessionStore.authorizeSocket(sessionId, "viewer", viewer.viewerToken));
    const turnUrl = process.env.TURN_URL?.trim();
    const turnUsername = process.env.TURN_USERNAME?.trim();
    const turnCredential = process.env.TURN_CREDENTIAL?.trim();
    if (!authorized || !turnUrl || !turnUsername || !turnCredential) {
      unavailable(response);
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    response.json({ iceServers: [{ urls: turnUrl, username: turnUsername, credential: turnCredential }] });
  });

  app.use((
    error: unknown,
    _request: express.Request,
    response: express.Response,
    next: express.NextFunction
  ) => {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    if (status === 400 || status === 413) {
      pairingUnavailable(response);
      return;
    }
    next(error);
  });

  if (serveWeb) {
    const webRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url));
    app.use(express.static(webRoot));
    app.get(["/", "/camera", "/viewer"], (_request, response) => {
      response.sendFile(resolve(webRoot, "index.html"));
    });
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer);

  io.use((socket, next) => {
    const auth = socket.handshake.auth as Record<string, unknown>;
    const cookieViewer = viewerCredentials(socket.handshake.headers.cookie);
    const sessionId = typeof auth.sessionId === "string" ? auth.sessionId : cookieViewer?.sessionId ?? "";
    const role = auth.role === "camera" || auth.role === "viewer" ? auth.role : "";
    const token = typeof auth.token === "string" ? auth.token : cookieViewer?.viewerToken ?? "";
    if (!role && !sessionId && !token) {
      socket.data.anonymous = true;
      next();
      return;
    }
    if (!role || !opaqueIdSchema.safeParse(sessionId).success || !bearerTokenSchema.safeParse(`Bearer ${token}`).success) {
      next(new Error("unauthorized"));
      return;
    }
    if (!sessionStore.authorizeSocket(sessionId, role, token)) {
      next(new Error("unauthorized"));
      return;
    }
    socket.data.sessionId = sessionId;
    socket.data.role = role;
    next();
  });

  io.on("connection", (socket) => {
    if (socket.data.anonymous) return;
    const sessionId = socket.data.sessionId as string;
    const role = socket.data.role as "camera" | "viewer";
    const room = `session:${sessionId}`;
    if (role === "viewer" && !sessionStore.claimViewerSocket(sessionId, socket.id)) {
      socket.emit("rw:error", { code: "viewer_limit" });
      socket.disconnect(true);
      return;
    }
    void socket.join(room);
    socket.to(room).emit("rw:peer-joined", { role });
    io.to(room).emit("rw:viewer-count", { count: role === "viewer" ? 1 : 0 });

    socket.on("rw:signal", (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const value = message as Record<string, unknown>;
      if (!(["offer", "answer", "ice"].includes(String(value.type)))) return;
      const payload = value.payload;
      if (payload === undefined) return;
      socket.to(room).emit("rw:signal", { type: value.type, payload });
    });

    socket.on("disconnect", () => {
      if (role === "viewer") sessionStore.releaseViewerSocket(sessionId, socket.id);
      socket.to(room).emit("rw:peer-left", { role });
      io.to(room).emit("rw:viewer-count", { count: 0 });
    });
  });

  return { app, httpServer, io, sessionStore };
}

function cameraCredentials(sessionId: string, authorization: string | undefined) {
  const parsedSessionId = opaqueIdSchema.safeParse(sessionId);
  const parsedAuthorization = bearerTokenSchema.safeParse(authorization);
  if (!parsedSessionId.success || !parsedAuthorization.success) return undefined;

  return {
    sessionId: parsedSessionId.data,
    cameraToken: parsedAuthorization.data.slice("Bearer ".length)
  };
}

function unavailable(response: express.Response) {
  response.status(404).json({ error: "Session unavailable" });
}

function pairingUnavailable(response: express.Response) {
  response.status(400).json({ error: "Pairing unavailable" });
}

function tooManyRequests(response: express.Response, retryAfterSeconds: number) {
  response.setHeader("Retry-After", retryAfterSeconds.toString());
  response.status(429).json({ error: "Too many requests" });
}

function setViewerCookie(response: express.Response, sessionId: string, viewerToken: string) {
  response.cookie(VIEWER_COOKIE_NAME, `${sessionId}.${viewerToken}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: VIEWER_COOKIE_MAX_AGE_SECONDS * 1_000
  });
}

function clearViewerCookie(response: express.Response) {
  response.cookie(VIEWER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0
  });
}

function viewerCredentials(cookieHeader: string | undefined) {
  if (!cookieHeader) return undefined;
  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator).trim() !== VIEWER_COOKIE_NAME) continue;
    let value: string;
    try {
      value = decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
    const match = /^([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(value);
    if (!match) return undefined;
    return { sessionId: match[1], viewerToken: match[2] };
  }
  return undefined;
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { httpServer } = createRwServer({ serveWeb: process.env.SERVE_WEB === "true" });
  httpServer.listen(port, host, () => {
    console.log(`RW setup server listening on http://${host}:${port}`);
  });
}
