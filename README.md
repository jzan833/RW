# RW

RW is a browser-based room monitoring MVP. Product requirements and the implementation plan are in [`docs/`](docs/).

## Development setup

Requires Node.js 24 LTS and npm 11. This repository uses npm workspaces so the web and server packages share one lockfile and one install. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

1. Run `npm.cmd install` from the repository root.
2. Run `npm.cmd run dev` to start the web app and backend together.
3. Open the URL printed by Vite. The backend health check is available through `/api/health`.

Use `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build` to verify the scaffold. The home page currently offers Camera Mode and Viewer Mode navigation only; camera access, pairing, and streaming features have not been implemented.

`.env.example` contains placeholder names only. The current setup server reads `HOST` and `PORT` from its process environment; the other variables are reserved for later tasks. Copying `.env.example` as-is will not provide usable values.

The Vite development proxy sends `/api` and `/socket.io` requests to the local backend. Public HTTPS and TURN deployment are separate tasks in [`docs/plan.md`](docs/plan.md).
