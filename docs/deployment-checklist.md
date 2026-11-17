# T03/T04 prerequisites

User choice (2026-11-18): free hosting only, no domain purchase.

- [x] Free Node deployment Blueprint (`render.yaml`), one service, no database/disk.
- [x] Built frontend/API/Socket.IO served on one origin.
- [x] HTTPS route/health/WebSocket smoke-check command.
- [x] Source repository identified: `https://github.com/jzan833/RW.git`.
- [ ] Source commit pushed and available to Render.
- [ ] Render account connection.
- [ ] Successful public deploy and actual provider URL.
- [ ] Laptop + phone HTTPS and WSS checks with browser/network evidence.
- [ ] Managed TURN free account, private API credentials, quota and retention review.
- [ ] One-hour credential expiry, STUN and relay candidate tests.
- [ ] Missing/expired/invalid TURN credential rejected.

Why these are needed and exact steps: [deployment instructions](../deploy/README.md).

T03/T04 remain incomplete until public/device/relay evidence exists. After both pass, the next implementation task is **T05: camera permission, local preview and error UI**.
