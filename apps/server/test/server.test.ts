import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRwServer } from "../src/index.ts";

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
});
