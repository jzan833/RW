import express from "express";
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { Server } from "socket.io";
import { z } from "zod";
import { MonitoringSessionStore } from "./session-store.js";

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

export function createRwServer({
  serveWeb = false,
  sessionSecret = processSessionSecret,
  now
}: CreateRwServerOptions = {}) {
  const app = express();
  const sessionStore = new MonitoringSessionStore({ secret: sessionSecret, now });
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

    const invite = sessionStore.regenerateInvite(credentials.sessionId, credentials.cameraToken);
    if (!invite) {
      unavailable(response);
      return;
    }

    response.status(201).json({ invite });
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

    response.json({ status: "paired" });
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

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { httpServer } = createRwServer({ serveWeb: process.env.SERVE_WEB === "true" });
  httpServer.listen(port, host, () => {
    console.log(`RW setup server listening on http://${host}:${port}`);
  });
}
