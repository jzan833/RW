import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRwServer } from "../src/index.ts";
import {
  INVITE_REGENERATE_LIMIT,
  INVITE_TTL_MS,
  SESSION_TTL_MS
} from "../src/session-store.ts";

let rwServer = createRwServer();
let socket: Socket | undefined;

beforeEach(async () => {
  rwServer = createRwServer();
  rwServer.httpServer.listen(0, "127.0.0.1");
  await once(rwServer.httpServer, "listening");
});

afterEach(async () => {
  socket?.disconnect();
  socket = undefined;
  rwServer.io.close();
  await new Promise<void>((resolve) => rwServer.httpServer.close(() => resolve()));
});

describe("RW server setup", () => {
  it("returns the health status", async () => {
    const address = rwServer.httpServer.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("accepts a Socket.IO connection", async () => {
    const address = rwServer.httpServer.address() as AddressInfo;

    await new Promise<void>((resolve, reject) => {
      socket = createClient(`http://127.0.0.1:${address.port}`, {
        reconnection: false,
        timeout: 2_000,
        transports: ["websocket"]
      });
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });
  });

  it("sets privacy headers when the provider terminates HTTPS", async () => {
    const address = rwServer.httpServer.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-powered-by")).toBeNull();
  });

  it("rejects cross-origin state-changing requests", async () => {
    const address = rwServer.httpServer.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/monitoring-sessions`, {
      method: "POST",
      headers: { Origin: "https://attacker.example" }
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Cross-origin request rejected" });
  });

  it("does not turn an unknown API endpoint into an HTML success", async () => {
    const address = rwServer.httpServer.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/not-found`);
    expect(response.status).toBe(404);
  });
});

type SessionResponse = {
  sessionId: string;
  cameraToken: string;
  expiresAt: string;
  invite: {
    inviteId: string;
    pin: string;
    expiresAt: string;
  };
};

const opaqueValue = /^[A-Za-z0-9_-]{43}$/;

async function createMonitoringSession(server = rwServer): Promise<SessionResponse> {
  const address = server.httpServer.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/api/monitoring-sessions`, {
    method: "POST"
  });
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.json() as Promise<SessionResponse>;
}

describe("T06 monitoring session lifecycle", () => {
  it("creates an in-memory session, camera role token, and five-minute invite", async () => {
    const before = Date.now();
    const session = await createMonitoringSession();
    const after = Date.now();

    expect(opaqueValue.test(session.sessionId)).toBe(true);
    expect(opaqueValue.test(session.cameraToken)).toBe(true);
    expect(opaqueValue.test(session.invite.inviteId)).toBe(true);
    expect(/^\d{6}$/.test(session.invite.pin)).toBe(true);
    expect(Date.parse(session.expiresAt)).toBeGreaterThanOrEqual(before + SESSION_TTL_MS);
    expect(Date.parse(session.expiresAt)).toBeLessThanOrEqual(after + SESSION_TTL_MS);
    expect(Date.parse(session.invite.expiresAt)).toBeGreaterThanOrEqual(before + INVITE_TTL_MS);
    expect(Date.parse(session.invite.expiresAt)).toBeLessThanOrEqual(after + INVITE_TTL_MS);
  });

  it("regenerates the invite only with the camera role token", async () => {
    const session = await createMonitoringSession();
    const address = rwServer.httpServer.address() as AddressInfo;
    const endpoint = `http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}/invite`;

    const missingToken = await fetch(endpoint, { method: "POST" });
    const wrongToken = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${"x".repeat(43)}` }
    });
    const valid = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.cameraToken}` }
    });

    expect(missingToken.status).toBe(404);
    expect(wrongToken.status).toBe(404);
    await expect(missingToken.json()).resolves.toEqual({ error: "Session unavailable" });
    await expect(wrongToken.json()).resolves.toEqual({ error: "Session unavailable" });
    expect(valid.status).toBe(201);
    expect(valid.headers.get("cache-control")).toBe("no-store");
    const regenerated = await valid.json() as { invite: SessionResponse["invite"] };
    expect(opaqueValue.test(regenerated.invite.inviteId)).toBe(true);
    expect(regenerated.invite.inviteId === session.invite.inviteId).toBe(false);
    expect(/^\d{6}$/.test(regenerated.invite.pin)).toBe(true);
  });

  it("revokes the session and invite when the camera stops", async () => {
    const session = await createMonitoringSession();
    const address = rwServer.httpServer.address() as AddressInfo;
    const sessionEndpoint = `http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}`;
    const authorization = { Authorization: `Bearer ${session.cameraToken}` };

    const stopped = await fetch(sessionEndpoint, {
      method: "DELETE",
      headers: authorization
    });
    const regenerateAfterStop = await fetch(`${sessionEndpoint}/invite`, {
      method: "POST",
      headers: authorization
    });
    const stopAgain = await fetch(sessionEndpoint, {
      method: "DELETE",
      headers: authorization
    });

    expect(stopped.status).toBe(204);
    expect(regenerateAfterStop.status).toBe(404);
    expect(stopAgain.status).toBe(404);
  });

  it("notifies an active viewer when the camera stops monitoring", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(rwServer, session.invite.inviteId, session.invite.pin);
    const viewerCookie = viewerCookieHeader(paired).requestHeader;
    const address = rwServer.httpServer.address() as AddressInfo;
    const origin = `http://127.0.0.1:${address.port}`;
    const camera = createClient(origin, {
      auth: { role: "camera", sessionId: session.sessionId, token: session.cameraToken },
      reconnection: false,
      transports: ["websocket"]
    });
    const viewer = createClient(origin, {
      auth: { role: "viewer" },
      extraHeaders: { Cookie: viewerCookie },
      reconnection: false,
      transports: ["websocket"]
    });
    await Promise.all([waitForSocketConnect(camera), waitForSocketConnect(viewer)]);
    const sessionEnded = new Promise<void>((resolve) => viewer.once("rw:session-ended", resolve));

    const stopped = await fetch(`${origin}/api/monitoring-sessions/${session.sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.cameraToken}` }
    });

    expect(stopped.status).toBe(204);
    await expect(sessionEnded).resolves.toBeUndefined();
    camera.disconnect();
    viewer.disconnect();
  });

  it("notifies the camera as soon as an invite is paired", async () => {
    const session = await createMonitoringSession();
    const address = rwServer.httpServer.address() as AddressInfo;
    const camera = createClient(`http://127.0.0.1:${address.port}`, {
      auth: { role: "camera", sessionId: session.sessionId, token: session.cameraToken },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(camera);
    const pairedEvent = new Promise<void>((resolve) => camera.once("rw:viewer-paired", resolve));

    const paired = await pairViewer(rwServer, session.invite.inviteId, session.invite.pin);

    expect(paired.status).toBe(200);
    await expect(pairedEvent).resolves.toBeUndefined();
    camera.disconnect();
  });

  it("does not restore a session in a fresh server instance", async () => {
    const session = await createMonitoringSession();
    const replacement = createRwServer({ sessionSecret: "test-only-restart-secret" });
    replacement.httpServer.listen(0, "127.0.0.1");
    await once(replacement.httpServer, "listening");

    try {
      const address = replacement.httpServer.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}/invite`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.cameraToken}` }
        }
      );
      expect(response.status).toBe(404);
    } finally {
      replacement.io.close();
      await new Promise<void>((resolve) => replacement.httpServer.close(() => resolve()));
    }
  });

  it("expires a monitoring session after twelve hours", async () => {
    let now = Date.UTC(2026, 10, 18, 0, 0, 0);
    const expiringServer = createRwServer({
      sessionSecret: "test-only-expiry-secret",
      now: () => now
    });
    expiringServer.httpServer.listen(0, "127.0.0.1");
    await once(expiringServer.httpServer, "listening");

    try {
      const session = await createMonitoringSession(expiringServer);
      now += SESSION_TTL_MS;
      const address = expiringServer.httpServer.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}/invite`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.cameraToken}` }
        }
      );
      expect(response.status).toBe(404);
    } finally {
      expiringServer.io.close();
      await new Promise<void>((resolve) => expiringServer.httpServer.close(() => resolve()));
    }
  });
});

async function pairViewer(
  server: typeof rwServer,
  inviteId: string,
  pin: string,
  bodyOverride?: unknown,
  sourceIp?: string
) {
  const address = server.httpServer.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${address.port}/api/pairing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sourceIp ? { "X-Forwarded-For": sourceIp } : {})
    },
    body: JSON.stringify(bodyOverride ?? { inviteId, pin })
  });
}

describe("T08 PIN pairing", () => {
  it("pairs with the correct PIN and makes the invite single-use", async () => {
    const session = await createMonitoringSession();

    const paired = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );
    const reused = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );

    expect(paired.status).toBe(200);
    expect(paired.headers.get("cache-control")).toBe("no-store");
    await expect(paired.json()).resolves.toEqual({ status: "paired" });
    expect(reused.status).toBe(400);
    await expect(reused.json()).resolves.toEqual({ error: "Pairing unavailable" });
  });

  it("rejects a wrong PIN without consuming a valid invite", async () => {
    const session = await createMonitoringSession();
    const wrongPin = session.invite.pin === "000000" ? "000001" : "000000";

    const rejected = await pairViewer(
      rwServer,
      session.invite.inviteId,
      wrongPin
    );
    const pairedAfterRetry = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );

    expect(rejected.status).toBe(400);
    await expect(rejected.json()).resolves.toEqual({ error: "Pairing unavailable" });
    expect(pairedAfterRetry.status).toBe(200);
  });

  it("rejects an invite after its five-minute expiry", async () => {
    let now = Date.UTC(2026, 10, 18, 0, 0, 0);
    const expiringServer = createRwServer({
      sessionSecret: "test-only-pairing-expiry-secret",
      now: () => now
    });
    expiringServer.httpServer.listen(0, "127.0.0.1");
    await once(expiringServer.httpServer, "listening");

    try {
      const session = await createMonitoringSession(expiringServer);
      now += INVITE_TTL_MS;
      const response = await pairViewer(
        expiringServer,
        session.invite.inviteId,
        session.invite.pin
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Pairing unavailable" });
    } finally {
      expiringServer.io.close();
      await new Promise<void>((resolve) => expiringServer.httpServer.close(() => resolve()));
    }
  });

  it("validates pairing input without revealing whether an invite exists", async () => {
    const session = await createMonitoringSession();
    const malformed = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin,
      { inviteId: session.invite.inviteId, pin: session.invite.pin, extra: true }
    );
    const unknown = await pairViewer(
      rwServer,
      "u".repeat(43),
      "000000"
    );

    expect(malformed.status).toBe(400);
    expect(unknown.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({ error: "Pairing unavailable" });
    await expect(unknown.json()).resolves.toEqual({ error: "Pairing unavailable" });
  });
});

describe("T09 pairing abuse limits", () => {
  it("invalidates an invite after five wrong PIN attempts", async () => {
    const session = await createMonitoringSession();
    const wrongPin = session.invite.pin === "000000" ? "000001" : "000000";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rejected = await pairViewer(
        rwServer,
        session.invite.inviteId,
        wrongPin
      );
      expect(rejected.status).toBe(400);
    }

    const correctAfterLockout = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );
    expect(correctAfterLockout.status).toBe(400);
    await expect(correctAfterLockout.json()).resolves.toEqual({ error: "Pairing unavailable" });
  });

  it("limits one source IP to twenty pairing requests per five minutes", async () => {
    const sourceIp = "198.51.100.10";
    for (let requestNumber = 0; requestNumber < 20; requestNumber += 1) {
      const response = await pairViewer(
        rwServer,
        "u".repeat(43),
        "000000",
        undefined,
        sourceIp
      );
      expect(response.status).toBe(400);
    }

    const limited = await pairViewer(
      rwServer,
      "u".repeat(43),
      "000000",
      undefined,
      sourceIp
    );
    const differentSource = await pairViewer(
      rwServer,
      "u".repeat(43),
      "000000",
      undefined,
      "198.51.100.11"
    );

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    await expect(limited.json()).resolves.toEqual({ error: "Too many requests" });
    expect(differentSource.status).toBe(400);
  });

  it("limits invite regeneration to three requests per session per minute", async () => {
    const session = await createMonitoringSession();
    const address = rwServer.httpServer.address() as AddressInfo;
    const endpoint = `http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}/invite`;
    const headers = { Authorization: `Bearer ${session.cameraToken}` };

    for (let requestNumber = 0; requestNumber < INVITE_REGENERATE_LIMIT; requestNumber += 1) {
      const response = await fetch(endpoint, { method: "POST", headers });
      expect(response.status).toBe(201);
    }
    const limited = await fetch(endpoint, { method: "POST", headers });

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    await expect(limited.json()).resolves.toEqual({ error: "Too many requests" });
  });

  it("does not let invalid camera tokens consume regeneration capacity", async () => {
    const session = await createMonitoringSession();
    const address = rwServer.httpServer.address() as AddressInfo;
    const endpoint = `http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}/invite`;

    for (let requestNumber = 0; requestNumber < 4; requestNumber += 1) {
      const rejected = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${"x".repeat(43)}` }
      });
      expect(rejected.status).toBe(404);
    }

    for (let requestNumber = 0; requestNumber < INVITE_REGENERATE_LIMIT; requestNumber += 1) {
      const accepted = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.cameraToken}` }
      });
      expect(accepted.status).toBe(201);
    }
  });
});

const viewerCookieHeader = (response: Response) => {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Expected a viewer cookie");
  return {
    attributes: setCookie,
    requestHeader: setCookie.split(";", 1)[0]
  };
};

function waitForSocketConnect(client: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    client.once("connect", resolve);
    client.once("connect_error", reject);
  });
}

describe("T14 short-lived TURN authorization", () => {
  it("shares one TURN request when camera and viewer join at the same time", async () => {
    const iceServers = [{ urls: "turn:relay.example.test", username: "temporary", credential: "temporary" }];
    const issueTurn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return iceServers;
    });
    const instance = createRwServer({ issueTurn });
    instance.httpServer.listen(0, "127.0.0.1");
    await once(instance.httpServer, "listening");
    try {
      const session = await createMonitoringSession(instance);
      const paired = await pairViewer(instance, session.invite.inviteId, session.invite.pin);
      const cookie = viewerCookieHeader(paired).requestHeader;
      const address = instance.httpServer.address() as AddressInfo;
      const origin = `http://127.0.0.1:${address.port}`;
      const [camera, viewer] = await Promise.all([
        fetch(`${origin}/api/turn-credentials/${session.sessionId}`, {
          headers: { Authorization: `Bearer ${session.cameraToken}` }
        }),
        fetch(`${origin}/api/viewer-session/connection`, { headers: { Cookie: cookie } })
      ]);
      expect(camera.status).toBe(200);
      expect(viewer.status).toBe(200);
      expect((await camera.json() as { iceServers: unknown }).iceServers).toEqual(iceServers);
      expect((await viewer.json() as { iceServers: unknown }).iceServers).toEqual(iceServers);
      expect(issueTurn).toHaveBeenCalledOnce();
    } finally {
      instance.io.close();
      await new Promise<void>((resolve) => instance.httpServer.close(() => resolve()));
    }
  });

  it("only issues ICE servers to the paired viewer or camera and rejects stopped sessions", async () => {
    const issueTurn = vi.fn().mockResolvedValue([{ urls: "turn:relay.example.test", username: "temporary", credential: "temporary" }]);
    const instance = createRwServer({ issueTurn });
    instance.httpServer.listen(0, "127.0.0.1");
    await once(instance.httpServer, "listening");
    try {
      const session = await createMonitoringSession(instance);
      const paired = await pairViewer(instance, session.invite.inviteId, session.invite.pin);
      const cookie = viewerCookieHeader(paired);
      const address = instance.httpServer.address() as AddressInfo;
      const endpoint = `http://127.0.0.1:${address.port}/api/turn-credentials/${session.sessionId}`;
      expect((await fetch(endpoint)).status).toBe(404);
      expect(issueTurn).not.toHaveBeenCalled();
      const viewerConnection = await fetch(`http://127.0.0.1:${address.port}/api/viewer-session/connection`, {
        headers: { Cookie: cookie.requestHeader }
      });
      expect(viewerConnection.status).toBe(200);
      expect(viewerConnection.headers.get("cache-control")).toBe("no-store");
      await expect(viewerConnection.json()).resolves.toEqual({
        sessionId: session.sessionId,
        iceServers: [{ urls: "turn:relay.example.test", username: "temporary", credential: "temporary" }]
      });
      const viewer = await fetch(endpoint, { headers: { Cookie: cookie.requestHeader } });
      expect(viewer.status).toBe(200);
      expect(viewer.headers.get("cache-control")).toBe("no-store");
      expect((await viewer.json() as { expiresInSeconds: number }).expiresInSeconds).toBe(3600);
      expect((await fetch(endpoint, { headers: { Authorization: `Bearer ${session.cameraToken}` } })).status).toBe(200);
      await fetch(`http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${session.cameraToken}` }
      });
      expect((await fetch(endpoint, { headers: { Cookie: cookie.requestHeader } })).status).toBe(404);
      expect((await fetch(`http://127.0.0.1:${address.port}/api/viewer-session/connection`, {
        headers: { Cookie: cookie.requestHeader }
      })).status).toBe(401);
      expect(issueTurn).toHaveBeenCalledTimes(1);
    } finally {
      instance.io.close();
      await new Promise<void>((resolve) => instance.httpServer.close(() => resolve()));
    }
  });

  it("returns a direct ICE configuration when temporary TURN credentials are unavailable", async () => {
    const instance = createRwServer({ issueTurn: vi.fn().mockRejectedValue(new Error("provider unavailable")) });
    instance.httpServer.listen(0, "127.0.0.1");
    await once(instance.httpServer, "listening");
    try {
      const session = await createMonitoringSession(instance);
      const paired = await pairViewer(instance, session.invite.inviteId, session.invite.pin);
      const cookie = viewerCookieHeader(paired).requestHeader;
      const address = instance.httpServer.address() as AddressInfo;
      const connection = await fetch(`http://127.0.0.1:${address.port}/api/viewer-session/connection`, {
        headers: { Cookie: cookie }
      });

      expect(connection.status).toBe(200);
      await expect(connection.json()).resolves.toEqual({ sessionId: session.sessionId, iceServers: [] });
    } finally {
      instance.io.close();
      await new Promise<void>((resolve) => instance.httpServer.close(() => resolve()));
    }
  });
});

describe("T10 persistent viewer cookie", () => {
  it("sets a twelve-hour Secure HttpOnly SameSite cookie after pairing", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );
    const body = await paired.json() as Record<string, unknown>;
    const cookie = viewerCookieHeader(paired);
    const attributes = cookie.attributes.toLowerCase();

    expect(paired.status).toBe(200);
    expect(Object.keys(body)).toEqual(["status"]);
    expect(cookie.requestHeader.startsWith("__Host-rw_viewer=")).toBe(true);
    expect(attributes.includes("max-age=43200")).toBe(true);
    expect(attributes.includes("httponly")).toBe(true);
    expect(attributes.includes("secure")).toBe(true);
    expect(attributes.includes("samesite=strict")).toBe(true);
    expect(attributes.includes("path=/")).toBe(true);
    expect(attributes.includes("domain=")).toBe(false);
  });

  it("validates a persisted cookie while a browser without it remains unauthorized", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );
    const cookie = viewerCookieHeader(paired);
    const address = rwServer.httpServer.address() as AddressInfo;
    const endpoint = `http://127.0.0.1:${address.port}/api/viewer-session`;

    const reopenedBrowser = await fetch(endpoint, {
      headers: { Cookie: cookie.requestHeader }
    });
    const differentBrowser = await fetch(
      `${endpoint}?invite=${encodeURIComponent(session.invite.inviteId)}`
    );

    expect(reopenedBrowser.status).toBe(200);
    await expect(reopenedBrowser.json()).resolves.toEqual({ status: "paired" });
    expect(differentBrowser.status).toBe(401);
    await expect(differentBrowser.json()).resolves.toEqual({
      error: "Viewer session unavailable"
    });
  });

  it("rejects and clears the viewer cookie after the camera session stops", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );
    const cookie = viewerCookieHeader(paired);
    const address = rwServer.httpServer.address() as AddressInfo;
    const sessionEndpoint = `http://127.0.0.1:${address.port}/api/monitoring-sessions/${session.sessionId}`;
    await fetch(sessionEndpoint, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.cameraToken}` }
    });

    const rejected = await fetch(`http://127.0.0.1:${address.port}/api/viewer-session`, {
      headers: { Cookie: cookie.requestHeader }
    });
    const clearedCookie = rejected.headers.get("set-cookie")?.toLowerCase() ?? "";

    expect(rejected.status).toBe(401);
    expect(clearedCookie.startsWith("__host-rw_viewer=")).toBe(true);
    expect(clearedCookie.includes("max-age=0")).toBe(true);
  });

  it("does not restore a viewer cookie in a fresh server instance", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(
      rwServer,
      session.invite.inviteId,
      session.invite.pin
    );
    const cookie = viewerCookieHeader(paired);
    const replacement = createRwServer({ sessionSecret: "test-only-viewer-restart-secret" });
    replacement.httpServer.listen(0, "127.0.0.1");
    await once(replacement.httpServer, "listening");

    try {
      const address = replacement.httpServer.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/viewer-session`, {
        headers: { Cookie: cookie.requestHeader }
      });
      expect(response.status).toBe(401);
    } finally {
      replacement.io.close();
      await new Promise<void>((resolve) => replacement.httpServer.close(() => resolve()));
    }
  });
});

describe("T16 camera speaker status", () => {
  it("relays readiness from the authenticated camera and clears it on disconnect", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(rwServer, session.invite.inviteId, session.invite.pin);
    const cookie = viewerCookieHeader(paired).requestHeader;
    const address = rwServer.httpServer.address() as AddressInfo;
    const origin = `http://127.0.0.1:${address.port}`;
    const camera = createClient(origin, {
      auth: { role: "camera", sessionId: session.sessionId, token: session.cameraToken },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(camera);
    const statuses: boolean[] = [];
    const viewer = createClient(origin, {
      auth: { role: "viewer" },
      extraHeaders: { Cookie: cookie },
      reconnection: false,
      transports: ["websocket"]
    });
    viewer.on("rw:speaker-status", (event: { ready: boolean }) => statuses.push(event.ready));
    await waitForSocketConnect(viewer);
    await vi.waitFor(() => expect(statuses).toContain(false));

    const becameReady = new Promise<void>((resolve) => {
      const handleStatus = (event: { ready: boolean }) => {
        if (!event.ready) return;
        viewer.off("rw:speaker-status", handleStatus);
        resolve();
      };
      viewer.on("rw:speaker-status", handleStatus);
    });
    camera.emit("rw:speaker-status", { ready: true });
    await becameReady;
    expect(statuses.at(-1)).toBe(true);

    const becameUnavailable = new Promise<void>((resolve) => {
      const handleStatus = (event: { ready: boolean }) => {
        if (event.ready) return;
        viewer.off("rw:speaker-status", handleStatus);
        resolve();
      };
      viewer.on("rw:speaker-status", handleStatus);
    });
    camera.disconnect();
    await becameUnavailable;
    expect(statuses.at(-1)).toBe(false);
    viewer.disconnect();
  });

  it("does not let a viewer publish speaker readiness", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(rwServer, session.invite.inviteId, session.invite.pin);
    const viewer = createClient(`http://127.0.0.1:${(rwServer.httpServer.address() as AddressInfo).port}`, {
      auth: { role: "viewer" },
      extraHeaders: { Cookie: viewerCookieHeader(paired).requestHeader },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(viewer);
    const statuses: boolean[] = [];
    viewer.on("rw:speaker-status", (event: { ready: boolean }) => statuses.push(event.ready));
    viewer.emit("rw:speaker-status", { ready: true });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(statuses).not.toContain(true);
    viewer.disconnect();
  });
});

describe("T17 authenticated talk status", () => {
  it("relays talk state only for a paired viewer while the camera speaker is ready", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(rwServer, session.invite.inviteId, session.invite.pin);
    const cookie = viewerCookieHeader(paired).requestHeader;
    const address = rwServer.httpServer.address() as AddressInfo;
    const origin = `http://127.0.0.1:${address.port}`;
    const camera = createClient(origin, {
      auth: { role: "camera", sessionId: session.sessionId, token: session.cameraToken },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(camera);
    const viewer = createClient(origin, {
      auth: { role: "viewer" },
      extraHeaders: { Cookie: cookie },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(viewer);
    const talkingStates: boolean[] = [];
    camera.on("rw:viewer-talking", (event: { talking: boolean }) => talkingStates.push(event.talking));

    viewer.emit("rw:talk-status", { talking: true });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(talkingStates).toEqual([]);

    const ready = new Promise<void>((resolve) => {
      const onSpeakerStatus = (event: { ready: boolean }) => {
        if (!event.ready) return;
        viewer.off("rw:speaker-status", onSpeakerStatus);
        resolve();
      };
      viewer.on("rw:speaker-status", onSpeakerStatus);
    });
    camera.emit("rw:speaker-status", { ready: true });
    await ready;

    const started = new Promise<void>((resolve) => camera.once("rw:viewer-talking", (event: { talking: boolean }) => {
      if (event.talking) resolve();
    }));
    viewer.emit("rw:talk-status", { talking: true });
    await started;
    const stopped = new Promise<void>((resolve) => camera.once("rw:viewer-talking", (event: { talking: boolean }) => {
      if (!event.talking) resolve();
    }));
    viewer.emit("rw:talk-status", { talking: false });
    await stopped;
    expect(talkingStates).toEqual([true, false]);
    camera.disconnect();
    viewer.disconnect();
  });
});

describe("T18 authenticated alarm control", () => {
  it("gates alarms on speaker readiness, allows one at a time, and relays start and stop acknowledgements", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(rwServer, session.invite.inviteId, session.invite.pin);
    const cookie = viewerCookieHeader(paired).requestHeader;
    const address = rwServer.httpServer.address() as AddressInfo;
    const origin = `http://127.0.0.1:${address.port}`;
    const camera = createClient(origin, {
      auth: { role: "camera", sessionId: session.sessionId, token: session.cameraToken },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(camera);
    const viewer = createClient(origin, {
      auth: { role: "viewer" },
      extraHeaders: { Cookie: cookie },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(viewer);

    const notReady = new Promise<{ requestId: string; status: string }>((resolve) => {
      viewer.on("rw:alarm-result", (event: { requestId: string; status: string }) => {
        if (event.requestId === "alarm-0") resolve(event);
      });
    });
    viewer.emit("rw:alarm", { requestId: "alarm-0" });
    expect(await notReady).toEqual({ requestId: "alarm-0", status: "failed" });

    const ready = new Promise<void>((resolve) => {
      const onStatus = (event: { ready: boolean }) => {
        if (!event.ready) return;
        viewer.off("rw:speaker-status", onStatus);
        resolve();
      };
      viewer.on("rw:speaker-status", onStatus);
    });
    camera.emit("rw:speaker-status", { ready: true });
    await ready;

    const delivered = new Promise<{ requestId: string }>((resolve) => {
      camera.once("rw:alarm", resolve);
    });
    viewer.emit("rw:alarm", { requestId: "alarm-1" });
    expect(await delivered).toEqual({ requestId: "alarm-1" });

    const duplicate = new Promise<{ requestId: string; status: string }>((resolve) => {
      viewer.on("rw:alarm-result", (event: { requestId: string; status: string }) => {
        if (event.requestId === "alarm-2") resolve(event);
      });
    });
    viewer.emit("rw:alarm", { requestId: "alarm-2" });
    expect(await duplicate).toEqual({ requestId: "alarm-2", status: "failed" });

    const started = new Promise<{ requestId: string; status: string }>((resolve) => {
      viewer.on("rw:alarm-result", (event: { requestId: string; status: string }) => {
        if (event.requestId === "alarm-1" && event.status === "started") resolve(event);
      });
    });
    camera.emit("rw:alarm-result", { requestId: "alarm-1", status: "started" });
    expect(await started).toEqual({ requestId: "alarm-1", status: "started" });

    const stopCommand = new Promise<{ requestId: string }>((resolve) => camera.once("rw:alarm-stop", resolve));
    viewer.emit("rw:alarm-stop", { requestId: "alarm-1" });
    expect(await stopCommand).toEqual({ requestId: "alarm-1" });
    const ended = new Promise<{ requestId: string; status: string }>((resolve) => {
      viewer.on("rw:alarm-result", (event: { requestId: string; status: string }) => {
        if (event.requestId === "alarm-1" && event.status === "ended") resolve(event);
      });
    });
    camera.emit("rw:alarm-result", { requestId: "alarm-1", status: "ended" });
    expect(await ended).toEqual({ requestId: "alarm-1", status: "ended" });

    const secondAlarm = new Promise<{ requestId: string }>((resolve) => camera.once("rw:alarm", resolve));
    viewer.emit("rw:alarm", { requestId: "alarm-3" });
    await secondAlarm;
    const disconnectedStop = new Promise<{ requestId: string }>((resolve) => camera.once("rw:alarm-stop", resolve));
    viewer.disconnect();
    expect(await disconnectedStop).toEqual({ requestId: "alarm-3" });
    camera.disconnect();
  });
});

describe("T19 viewer socket re-entry", () => {
  it("replaces a stale socket for the same paired browser and keeps one active viewer", async () => {
    const session = await createMonitoringSession();
    const paired = await pairViewer(rwServer, session.invite.inviteId, session.invite.pin);
    const cookie = viewerCookieHeader(paired).requestHeader;
    const address = rwServer.httpServer.address() as AddressInfo;
    const origin = `http://127.0.0.1:${address.port}`;
    const camera = createClient(origin, {
      auth: { role: "camera", sessionId: session.sessionId, token: session.cameraToken },
      reconnection: false,
      transports: ["websocket"]
    });
    const cameraConnected = waitForSocketConnect(camera);
    await cameraConnected;
    const viewerCounts: number[] = [];
    const peerLeft = vi.fn();
    camera.on("rw:viewer-count", (event: { count: number }) => viewerCounts.push(event.count));
    camera.on("rw:peer-left", peerLeft);

    const firstViewer = createClient(origin, {
      auth: { role: "viewer" },
      extraHeaders: { Cookie: cookie },
      reconnection: false,
      transports: ["websocket"]
    });
    await waitForSocketConnect(firstViewer);
    const firstViewerDisconnected = new Promise<void>((resolve) => firstViewer.once("disconnect", () => resolve()));

    const returningViewer = createClient(origin, {
      auth: { role: "viewer" },
      extraHeaders: { Cookie: cookie },
      reconnection: false,
      transports: ["websocket"]
    });
    await Promise.all([waitForSocketConnect(returningViewer), firstViewerDisconnected]);

    expect(firstViewer.connected).toBe(false);
    expect(returningViewer.connected).toBe(true);
    expect(viewerCounts.at(-1)).toBe(1);
    expect(peerLeft).not.toHaveBeenCalled();

    camera.disconnect();
    firstViewer.disconnect();
    returningViewer.disconnect();
  });

  it("rejects a new browser that does not have the paired viewer cookie", async () => {
    const address = rwServer.httpServer.address() as AddressInfo;
    const unauthorizedViewer = createClient(`http://127.0.0.1:${address.port}`, {
      auth: { role: "viewer" },
      reconnection: false,
      transports: ["websocket"]
    });
    const connectError = new Promise<Error>((resolve) => unauthorizedViewer.once("connect_error", resolve));

    await expect(connectError).resolves.toBeInstanceOf(Error);
    expect(unauthorizedViewer.connected).toBe(false);
    unauthorizedViewer.disconnect();
  });
});
