import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRwServer } from "../src/index.ts";
import { INVITE_TTL_MS, SESSION_TTL_MS } from "../src/session-store.ts";

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
  bodyOverride?: unknown
) {
  const address = server.httpServer.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${address.port}/api/pairing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
