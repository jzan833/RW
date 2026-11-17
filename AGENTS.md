# RW Project Instructions

- Work on one task ID from `docs/plan.md` at a time. Check its dependencies before starting, and update its status only when its stated evidence exists.
- Before working on a task, read the relevant sections of `docs/requirements.md`, `docs/architecture.md`, `docs/data-flow.md`, `docs/security.md`, and `docs/out-of-scope.md`.
- Never add stealth monitoring or hidden camera capture. The camera screen must visibly show monitoring status and offer a clear Stop Monitoring action whenever capture is active.
- Never record or log video, audio, PINs, pairing URLs, viewer/camera tokens, TURN credentials, or WebRTC signaling secrets. Keep media out of application storage and logs.
- Actually run the tests or checks relevant to the task. Record what ran and its result. Never report an unrun or unverified check as passed.
- Preserve existing user files. Do not delete them as a shortcut for setup or implementation.
