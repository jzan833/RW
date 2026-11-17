# RW deployment

## Current choice: free hosting, no purchased domain

The user chose free deployment on 2026-11-18. `render.yaml` configures one Render Free Node service. It serves built React files, the API and Socket.IO from a single provider URL. Render supplies `https://<assigned-name>.onrender.com` and TLS; Caddy/systemd are retained only as an alternative VPS recipe.

### Requirements and why

| Requirement | Purpose | Setup state |
| --- | --- | --- |
| Render account and connected Render plugin | Create and inspect the free web service | User connection needed |
| Git repository accessible by Render | Build the exact source revision | https://github.com/jzan833/RW.git, `main` pushed; Render Git authorization pending |
| `render.yaml`, `plan: free` | Select the free instance and reproducible build/start commands | Added |
| `HOST=0.0.0.0`, provider `PORT`, `SERVE_WEB=true` | Accept provider traffic and serve frontend/API on one origin | Configured in Blueprint |
| HTTPS endpoints and WSS handshake | Verify public connectivity, routes and API routing | Checker added; public URL pending |
| Managed TURN account and private API credentials | Relay across restrictive networks without running a public UDP server | Not provisioned |
| Laptop and phone browsers | Confirm trusted certificates, rendering and WebSocket connectivity on each device | Public test pending |

### Free deploy steps

#### Account connection နှင့် ပထမ deploy

1. Render integration ကို install/connect လုပ်၍ browser တွင် ကိုယ်ပိုင် Render account ဖြင့် sign in/authorize လုပ်ပါ။ Password သို့မဟုတ် API key ကို chat ထဲပို့ရန်မလိုပါ။ Assistant integration ချိတ်ခြင်းနှင့် Render က Git repository ဖတ်ခွင့်ရခြင်းသည် သီးခြားအဆင့်နှစ်ခုဖြစ်သည်။
2. RW source ကို GitHub/GitLab repository ထဲတွင်ထားရန်လိုသည်။ Repository ရှိပြီးပါက URL ပေးပါ။ လက်ရှိ local repo တွင် remote မရှိသေးသောကြောင့် မိမိ account/repo ကို ခန့်မှန်းပြီး publish မလုပ်ထားပါ။
3. [Render Dashboard](https://dashboard.render.com/) တွင် **New → Blueprint** ကိုရွေးပြီး RW repository ကို Connect လုပ်ပါ။ Git provider authorization တောင်းလျှင် RW repository အတွက် access ပေးပါ။
4. Branch နှင့် root `render.yaml` ကိုရွေးပါ။ Review စာမျက်နှာတွင် **web service တစ်ခု၊ plan Free** ဖြစ်ကြောင်းစစ်ပြီး **Deploy Blueprint** လုပ်ပါ။ Database/disk/paid compute မရွေးရ။
5. Render service က **Live** ပြပြီး actual `https://…onrender.com` URL ရလာမှ အောက်ပါ HTTPS/WSS checks ဆက်လုပ်ပါ။ Build failure ရှိလျှင် error ကိုစစ်ပြီးမှ retry လုပ်ရန်ဖြစ်သည်။ Service name တစ်ခုတည်းမှ URL ကို မခန့်မှန်းရ။
6. Assistant က connection အတည်ပြုနိုင်ပြီး source access ရရှိပါက deploy/status/checks ဆက်လုပ်နိုင်သည်။ Phone browser စစ်ချက်အတွက် device ပေါ်မှရလဒ်ကို သီးခြားမှတ်တမ်းတင်ရမည်။

ဤအဆင့်များသည် [official first-deploy instructions](https://render.com/docs/your-first-deploy) နှင့် [Blueprint setup](https://render.com/docs/infrastructure-as-code) ကို အခြေခံသည်။

#### Build နှင့် acceptance configuration

1. Connect Render through the available integration. Link the source repository in Render (keep secrets out of commits). No repository is published automatically by this setup.
2. Create a Blueprint from the repository using `render.yaml`; select the Free plan and do not enable paid resources. No custom domain, database, or persistent disk is required.
3. Build: `npm ci --include=dev && npm run build`. Start: `npm run start -w @rw/server`. Health check: `/api/health`. Render supplies `PORT`; leave it unset in the Blueprint.
4. When Render returns the actual URL, run `npm run check:deploy -- https://ASSIGNED_NAME.onrender.com`. The checker validates JSON health, HTML app routes, and an actual Socket.IO connection using WebSocket transport. It requires a trusted HTTPS certificate and does not print tokens, headers or URLs.
5. Open `/`, `/camera`, `/viewer` and `/api/health` on laptop and phone; inspect browser Network for `/socket.io/` with status `101` over `wss:`. Record device/browser/network and results in `docs/plan.md`. CLI success does not prove phone-browser success.

Render Free sleeps after 15 minutes without inbound HTTP/WebSocket traffic; waking can take about a minute. Session state lives in memory, so service restart/sleep invalidates sessions. Free hosting cannot guarantee the release timeouts during cold starts or uninterrupted monitoring. Keep this constraint visible in release acceptance rather than marking it passed. See [Render Free](https://render.com/docs/free), [Web Services](https://render.com/docs/web-services), [WebSockets](https://render.com/docs/websocket), and [Blueprint specification](https://render.com/docs/blueprint-spec).

### T04 on free hosting

Render web hosting does not replace a public UDP TURN server. Under the free-hosting choice, use a managed TURN free tier instead of installing coturn on the web service. This is a deployment change from the original T04 implementation; the STUN/relay/unauthorized-allocation acceptance requirements remain.

Metered currently lists a **500 MB monthly TURN trial**, with no credit card required: [official pricing](https://www.metered.ca/pricing). It is a bounded trial, not unlimited free media. Verify the account's actual quota and stop behavior before activation, and do not enable overage/paid plans. A managed provider's logging/retention policy must also be reviewed against `docs/security.md` before acceptance.

The provider account, API access, one-hour credential expiry support, and relay/invalid-credential tests are still required. Keep management credentials only in the backend's private runtime environment. Credential delivery to authorized RW sessions remains T14; do not embed a permanent public TURN username/password in React.

## Alternative: Linux VPS

This directory contains the T03 deployment recipe. It does not contain a domain, key, certificate, password, token, or other secret.

## Target layout

- Caddy listens publicly on TCP 80/443 and serves `/opt/rw/apps/web/dist`.
- Caddy proxies `/api/*` and `/socket.io/*` to the Node server at `127.0.0.1:3000`.
- The Node server is a systemd service and is never exposed directly to the public network.
- Caddy access logging is intentionally not configured because pairing URLs and secrets must not enter logs.

## Prerequisites

1. A Linux VPS with a public IP.
2. An A/AAAA DNS record for the production domain pointing to that VPS.
3. TCP 80 and 443 open in the VPS firewall/security group.
4. Node.js/npm and Caddy installed using their official installation documentation.

The current repository does not contain VPS credentials or a production domain, so the public certificate and WSS checks must be run on the target VPS.

## Install the app

Run these commands on the VPS after placing the repository at `/opt/rw`:

```sh
sudo useradd --system --home-dir /opt/rw --shell /usr/sbin/nologin rw
sudo chown -R rw:rw /opt/rw
cd /opt/rw
npm ci
npm run typecheck
npm run build
```

Create `/etc/rw/rw.env` with the variable names from the repository root `.env.example`. Replace every placeholder with a deployment value and make it readable only by the service user:

```sh
sudo install -d -o rw -g rw -m 750 /etc/rw
sudo install -o rw -g rw -m 600 /dev/null /etc/rw/rw.env
sudoedit /etc/rw/rw.env
```

Keep `HOST=127.0.0.1` and `PORT=3000`. Do not put PINs, tokens, TURN credentials, or media data in logs or the environment file beyond the server secrets required by later tasks.

## Install the Node service

```sh
sudo install -o root -g root -m 644 deploy/rw.service /etc/systemd/system/rw.service
sudo systemctl daemon-reload
sudo systemctl enable --now rw.service
sudo systemctl status rw.service --no-pager
```

## Configure Caddy

Copy `deploy/Caddyfile.example` to `/etc/caddy/Caddyfile`, replace the site address `rw.example.com` with the real domain, then validate and reload:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains and renews the HTTPS certificate when DNS and ports 80/443 are correct. The reverse proxy keeps WebSocket upgrades enabled for Socket.IO.

## T03 acceptance checks

Run these on the VPS and from both a laptop and a phone:

```sh
curl --fail --silent --show-error https://YOUR_DOMAIN/api/health
```

The response must be `{"status":"ok"}` over HTTPS. Open `/`, `/camera`, and `/viewer` from each device and check that the certificate is trusted. Then use the running web app's Socket.IO client to confirm a WSS handshake; do not mark T03 complete until that handshake and both-device HTTPS checks are recorded with the real domain and browser versions.

## T04 TURN prerequisites

T04 is a separate coturn service on the VPS (or a second public VPS). It is not proxied through Caddy.

1. Allow UDP `3478` for STUN/TURN and UDP `49152-65535` for relay allocations in the VPS firewall/security group. Keep the Node port `3000` private.
2. Copy `deploy/coturn.conf.example` to `/etc/turnserver.conf` and replace the realm, public IP, and shared secret. Keep the shared secret out of Git and application logs.
3. Install and enable coturn using the Linux distribution's official package instructions, then restart it after validating the configuration.
4. The backend must later mint time-limited TURN credentials from `TURN_SHARED_SECRET` for an already-authorized session. A TURN credential is not an RW viewer authorization.
5. Test with a WebRTC client: an authorized client must receive a STUN candidate and a `relay` candidate through TURN; a client without a valid short-lived credential must not receive a TURN allocation.

Do not mark T04 complete from a config-file check alone. Record the TURN server version, public IP/firewall rule, credential expiry, selected `relay` candidate, and the fact that no media recording/logging is enabled.
