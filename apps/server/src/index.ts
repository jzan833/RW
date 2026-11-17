import express from "express";
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Server } from "socket.io";

export function createRwServer({ serveWeb = false }: { serveWeb?: boolean } = {}) {
  const app = express();
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

  if (serveWeb) {
    const webRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url));
    app.use(express.static(webRoot));
    app.get(["/", "/camera", "/viewer"], (_request, response) => {
      response.sendFile(resolve(webRoot, "index.html"));
    });
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer);

  return { app, httpServer, io };
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { httpServer } = createRwServer({ serveWeb: process.env.SERVE_WEB === "true" });
  httpServer.listen(port, host, () => {
    console.log(`RW setup server listening on http://${host}:${port}`);
  });
}
