import express from "express";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { Server } from "socket.io";

export function createRwServer() {
  const app = express();
  app.disable("x-powered-by");
  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer);

  return { app, httpServer, io };
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { httpServer } = createRwServer();
  httpServer.listen(port, host, () => {
    console.log(`RW setup server listening on http://${host}:${port}`);
  });
}
