import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
app.disable("x-powered-by");
app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

const httpServer = createServer(app);
new Server(httpServer);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

httpServer.listen(port, host, () => {
  console.log(`RW setup server listening on http://${host}:${port}`);
});
