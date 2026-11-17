# RW

RW is a browser-based room monitoring MVP built with React, Express and Socket.IO.

## Development setup

Requires Node.js 24 LTS and npm 11. This repository uses npm workspaces so the web and server packages share one lockfile and one install. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

1. Run `npm.cmd install` from the repository root.
2. Run `npm.cmd run dev` to start the web app and backend together.
3. Open the URL printed by Vite. The backend health check is available through `/api/health`.

Use `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build` to verify the scaffold. The home page currently offers Camera Mode and Viewer Mode navigation only; camera access, pairing, and streaming features have not been implemented.

`.env.example` contains placeholder names only. The server reads `HOST`, `PORT` and `SERVE_WEB` from its process environment; the other variables are reserved for later features. Copying `.env.example` as-is will not provide usable values.

The Vite development proxy sends `/api` and `/socket.io` requests to the local backend. For free hosting without a purchased domain, `render.yaml` builds both workspaces and starts Express with `SERVE_WEB=true` so built React routes, API and Socket.IO share a provider HTTPS URL.

## Render deployment

Create a Blueprint in Render from this repository's `main` branch and root `render.yaml`. The configuration selects one Free Node service and `/api/health` as its health check. Render supplies the public URL, TLS certificate and `PORT`. No custom domain, database or persistent disk is required. Free instances can sleep when idle; service restarts clear in-memory sessions.

After deployment, run `npm.cmd run check:deploy -- https://ASSIGNED_NAME.onrender.com` to check health, web routes and a Socket.IO WSS handshake. Render connection/source access and a managed TURN account are still needed; deployment has not happened merely because the configuration exists.
