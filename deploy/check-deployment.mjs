import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/server/package.json", import.meta.url));
const { io } = require("socket.io-client");
const args = process.argv.slice(2);
const local = args.includes("--local");
const target = args.find((arg) => !arg.startsWith("--"));

async function checkDeployment() {
  assert(target, "Usage: npm run check:deploy -- https://YOUR_DOMAIN (or --local http://localhost:5173)");
  const origin = new URL(target);
  assert(!origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === "/",
    "Supply an origin only, without credentials, path, query, or fragment.");
  assert(origin.protocol === "https:" || (local && origin.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)), "HTTPS is required; --local permits loopback HTTP only.");

  const paths = ["/api/health", "/", "/camera", "/viewer"];
  for (const path of paths) {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(10_000), redirect: "error" });
    assert.equal(response.status, 200, `${path}: expected HTTP 200`);
    if (path === "/api/health") {
      assert.match(response.headers.get("content-type") ?? "", /application\/json/);
      assert.deepEqual(await response.json(), { status: "ok" });
    } else {
      assert.match(response.headers.get("content-type") ?? "", /text\/html/);
      assert.match(await response.text(), /id=["']root["']/);
    }
    console.log(`PASS ${path}`);
  }

  const socket = io(origin.origin, { transports: ["websocket"], reconnection: false, timeout: 10_000 });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Socket.IO connection timed out")), 12_000);
      socket.once("connect", () => { clearTimeout(timer); resolve(); });
      socket.once("connect_error", () => { clearTimeout(timer); reject(new Error("Socket.IO handshake failed")); });
    });
    assert.equal(socket.io.engine.transport.name, "websocket");
    console.log(`PASS Socket.IO ${origin.protocol === "https:" ? "WSS" : "WS (local only)"} handshake`);
  } finally {
    socket.disconnect();
  }
}

checkDeployment().catch((error) => {
  // Never print request URLs, server payloads, headers or credentials.
  console.error(error instanceof assert.AssertionError ? `FAIL ${error.message}` : "FAIL deployment check; inspect service/network availability.");
  process.exitCode = 1;
});
