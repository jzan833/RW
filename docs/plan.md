# RW MVP — Project Plan

ဤအစီအစဉ်သည် [requirements.md](requirements.md) ရှိ F01–F12၊ [architecture.md](architecture.md) နှင့် [security.md](security.md) ကို အခြေခံသည်။ ၂ ရက် MVP အတွက် task တစ်ခုစီကို သီးသန့်ပြီးကြောင်းစစ်နိုင်အောင် ခွဲထားသည်။ Status ကို setup နှင့် verification တိုးတက်မှုအလိုက် အောက်ပါဇယားတွင် update လုပ်ထားသည်။

**Status အသုံးပြုပုံ:** မစသေး → လုပ်ဆောင်နေ → ပြီး (အောက်ပါသက်သေရှိမှ)။ မှီခို task မပြီး၍ သို့မဟုတ် ပြင်ပအခြေအနေကြောင့် မဆက်နိုင်လျှင် **ပိတ်ဆို့နေ** ဟုမှတ်ပြီး အကြောင်းရင်းထည့်ရမည်။ `—` သည် မှီခို task မရှိဟု ဆိုလိုသည်။ Test သက်သေတွင် အသုံးပြုသော browser/device၊ network၊ ရလဒ်နှင့် screenshot/log အတိုချုံးကို မှတ်ထားရမည်။

## Day 1 — Camera မှ viewer ဆီ live video ရောက်စေခြင်း

| ID | လုပ်မည့်အရာ | မှီခိုတဲ့ task | ပြီးကြောင်းသက်သေ | Status |
| --- | --- | --- | --- | --- |
| T00 | Viewer cookie `Max-Age` နှင့် အများဆုံး supported monitoring duration ကို ဆုံးဖြတ်ပြီး requirements/security docs နှစ်ခုလုံးတွင် တူညီစွာရေးမည်။ | — | Docs နှစ်ခုတွင် **12 hours / 43,200 seconds** တစ်ခုတည်းရှိပြီး active session အတွင်း re-entry စည်းကမ်း မဆန့်ကျင်ကြောင်း review လုပ်ပြီးမှတ်ထားသည်။ | ပြီး |
| T01 | React + TypeScript + Vite frontend အခြေခံနှင့် camera/viewer screen route များ တည်ဆောက်မည်။ | — | Frontend build အောင်မြင်ပြီး laptop/phone viewport နှစ်ခုတွင် role screen နှစ်ခု ဖွင့်နိုင်သည်။ | ပြီး — ၂၀၂၆-၁၁-၁၈ တွင် user က laptop/phone visual check ပြီးကြောင်း အတည်ပြုထားသည်။ |
| T02 | Node + Express + Socket.IO backend အခြေခံနှင့် health endpoint တည်ဆောက်မည်။ | — | Local health request အောင်မြင်၊ Socket.IO client တစ်ခု ချိတ်/ဖြုတ်နိုင်ပြီး server error မရှိ။ | ပြီး |
| T03 | Free provider URL နှင့် managed HTTPS/WSS ဖြင့် frontend/backend ကို deploy လုပ်မည်။ မူလ VPS/Caddy recipe ကို alternative အဖြစ်ထားမည်။ | T01, T02 | Laptop နှင့် phone မှ HTTPS certificate မှန်ကန်စွာ site ဖွင့်နိုင်ပြီး health API နှင့် WSS handshake အောင်မြင်သည်။ | လုပ်ဆောင်နေ — Blueprint/source ကို GitHub main ပေါ် push ပြီး။ Render account/Git authorization နှင့် public acceptance ကျန်။ |
| T04 | Free managed STUN/TURN service နှင့် short-lived test credentials ပြင်ဆင်မည်။ မူလ coturn VPS recipe ကို alternative အဖြစ်ထားမည်။ | T03 | Test client မှ STUN candidate နှင့် TURN `relay` candidate ရသည်; credential မရှိလျှင် TURN allocation မရ။ | ပိတ်ဆို့နေ — T03 public deployment၊ managed TURN account/API access နှင့် quota/retention review ကျန်။ |
| T05 | Camera permission၊ local preview နှင့် permission/hardware error UI တည်ဆောက်မည် (F01)။ | T01, T03 | Laptop နှင့် phone browser မှ permission ပေးပြီး local preview ပေါ်သည်; ပယ်ချလျှင် capture မစဘဲ error ပြသည်။ | မစသေး |
| T06 | Backend monitoring session၊ camera role token၊ invite ထုတ်/အသစ်ထုတ် API နှင့် Stop/restart အတွက် ယာယီ state တည်ဆောက်မည် (F02, F07)။ | T02 | Camera session စလျှင် ID/token/invite ရ၊ invite အသစ်ထုတ်နိုင်၊ Stop လျှင် session ပျက်၊ backend restart နောက် session ဟောင်း မရှိတော့ကြောင်း API စစ်ချက် အောင်မြင်သည်။ | မစသေး |
| T07 | Camera screen တွင် QR link၊ သီးခြား ၆ လုံး PIN၊ invite expiry နှင့် regenerate UI ပြမည် (F03)။ | T05, T06 | QR scan လျှင် မှန်ကန်သော pair URL ဖွင့်သည်; URL ထဲ PIN မပါ; ၅ မိနစ်ပြည့်လျှင် expired ပြပြီး invite အသစ်ထုတ်နိုင်သည်။ | မစသေး |
| T08 | PIN pairing API၊ ၅ မိနစ် expiry နှင့် single-use invite ကို တည်ဆောက်မည် (F03)။ | T06 | မှန်သော PIN ဖြင့် pair အောင်မြင်၊ မှားသော/expired PIN ဖြင့် မအောင်မြင်၊ pair လုပ်ပြီးသား invite ကို ဒုတိယအကြိမ်မသုံးနိုင်ကြောင်း API test အောင်မြင်သည်။ | မစသေး |
| T09 | Pairing နှင့် invite regenerate rate limit များ ထည့်မည် (F03, F09)။ | T08 | Invite တစ်ခု PIN မှား ၅ ကြိမ်တွင် ပိတ်၊ IP တစ်ခု ၅ မိနစ် ၂၀ ကြိမ်နှင့် camera session တစ်ခု ၁ မိနစ် ၃ ကြိမ် ကန့်သတ်ချက်များကို သီးခြား request test ဖြင့် အတည်ပြုသည်။ | မစသေး |
| T10 | Pair အောင်မြင်သော viewer အတွက် persistent Secure/HttpOnly/SameSite cookie နှင့် server-side credential validation တည်ဆောက်မည် (F06)။ | T00, T08 | တူညီသော browser ကို ပိတ်/ပြန်ဖွင့်ပြီး auth စစ်လျှင် valid ဖြစ်သည်; URL ကို အခြား browser တွင်ဖွင့်ရုံဖြင့် invalid ဖြစ်သည်; camera session ပျက်လျှင် cookie reject ဖြစ်သည်။ | မစသေး |
| T11 | Socket.IO တွင် camera/viewer role စစ်ခြင်း၊ session room နှင့် active viewer ၁ ဦး ကန့်သတ်ချက် တည်ဆောက်မည် (F06, F09)။ | T02, T06, T10 | Token မရှိသော socket room မဝင်နိုင်; viewer ၁ ဦးဝင်ပြီးနောက် ဒုတိယ viewer မဝင်နိုင်; camera က viewer count မှန်စွာရသည်။ | မစသေး |
| T12 | WebRTC offer/answer/ICE signaling ကို Socket.IO ဖြင့် နှစ်ဖက် relay လုပ်မည်။ | T05, T11 | Browser နှစ်ခုတွင် media မထည့်သေးဘဲ WebRTC test connection တည်ဆောက်နိုင်ပြီး offer/answer/ICE message များကို သက်ဆိုင်ရာ session အတွင်းသာ ပို့ကြောင်း စစ်နိုင်သည်။ | မစသေး |
| T13 | Camera video track ကို viewer ထံ WebRTC ဖြင့်ပို့ပြီး Live UI ပြမည် (F04)။ | T05, T12 | Direct path test တွင် camera အရှေ့ လှုပ်ရှားမှုကို viewer ပေါ် ၂၀ စက္ကန့်အတွင်း မြင်ရသည်; server API ထဲ media payload မဝင်။ | မစသေး |
| T14 | ခွင့်ပြုထားသော session ကိုသာ TURN credential ထုတ်ပြီး TURN fallback ကို app WebRTC configuration ထဲချိတ်မည် (F04)။ | T04, T11, T13 | Unauthorized client TURN credential မရ; camera Wi-Fi + viewer cellular data ဖြင့် relay-only test တွင် selected ICE candidate သည် `relay` ဖြစ်ပြီး live video ပေါ်သည်။ | မစသေး |

**Day 1 milestone:** T14 ပြီးသည့်အခါ မတူသော network နှစ်ခုကြား viewer က camera video ကို ကြည့်နိုင်ရမည်။ TURN setup သည် cross-network acceptance အတွက် အဓိကမှီခိုမှုဖြစ်သည်။

## Day 2 — Audio၊ re-entry၊ privacy နှင့် release စစ်ဆေးမှု

| ID | လုပ်မည့်အရာ | မှီခိုတဲ့ task | ပြီးကြောင်းသက်သေ | Status |
| --- | --- | --- | --- | --- |
| T15 | Camera mic default Off နှင့် opt-in room audio toggle ထည့်မည် (F05)။ | T13 | Mic Off တွင် permission မတောင်း၊ viewer အသံမကြား; On လုပ်မှ permission တောင်းပြီး viewer ကြား; Off ပြန်လုပ်လျှင် အသံရပ်သည်။ | မစသေး |
| T16 | Camera **Enable Speaker / Speaker Ready** state နှင့် autoplay failure handling တည်ဆောက်မည် (F08, F11, F12)။ | T05 | Camera user နှိပ်ပြီး test sound ထွက်မှ Ready ပြ; playback ပိတ်ခံရလျှင် Not Ready ပြပြီး viewer action ကို အောင်မြင်သည်ဟု မပြ။ | မစသေး |
| T17 | Viewer **Hold to Talk** mic capture နှင့် viewer → camera WebRTC audio ထည့်မည် (F11)။ | T13, T16 | Talk စသုံးမှ viewer mic permission တောင်း; Live + Speaker Ready တွင် နှိပ်ထားစဉ် camera မှ viewer အသံကြားရ၊ လွှတ်/Disconnect/Stop Viewing တွင် mic capture နှင့် အသံပို့မှု ရပ်သည်။ | မစသေး |
| T18 | **Sound Alarm** command၊ camera ၅ စက္ကန့် local sound နှင့် playback ack ထည့်မည် (F12)။ | T11, T13, T16 | Live + Speaker Ready တွင် alarm ၅ စက္ကန့်မြည်၊ playback စမှ viewer တွင် success ပြ၊ failure တွင် failed ပြ၊ ထပ်နှိပ်ခြင်းဖြင့် အသံမထပ်တင်၊ viewer/camera နှစ်ဖက်မှ ရပ်နိုင်သည်။ | မစသေး |
| T19 | Viewer app ထွက်/refresh/ပြန်ဝင်ချိန် credential ပြန်စစ်ခြင်းနှင့် WebRTC အသစ်ညှိခြင်း တည်ဆောက်မည် (F06)။ | T10, T11, T13 | တူညီသော phone/browser မှ background ပြန်ဝင်၊ tab/browser ပိတ်ပြီးပြန်ဖွင့်၊ refresh သုံးမျိုးစလုံးတွင် QR/PIN မလိုဘဲ ၃၀ စက္ကန့်အတွင်း Live ပြန်ပေါ်၊ active viewer connection ၁ ခုသာ ကျန်သည်။ | မစသေး |
| T20 | Camera **Monitoring Active / Interrupted**၊ 0/1 viewer count နှင့် track/socket loss detection ထည့်မည် (F02)။ | T05, T06, T11, T13 | Capture + signaling အလုပ်လုပ်စဉ်သာ Active ပြ; viewer ချိတ်/ထွက်လျှင် count 0/1 မှန်; track သို့ socket ပြတ်လျှင် Interrupted ပြသည်။ | မစသေး |
| T21 | Camera **Stop Monitoring** နှင့် viewer **Stop Viewing** lifecycle ကို ပြည့်စုံအောင်လုပ်မည် (F07)။ | T06, T17, T18, T19, T20 | Viewer Stop သည် viewer/mic သာပိတ်; camera Stop သည် tracks၊ alarm၊ WebRTC၊ token/invite အားလုံးပိတ်ပြီး viewer တွင် Monitoring ended ပြ; camera tab ပိတ်လျှင် ၃၀ စက္ကန့်အတွင်း viewer ပြတ်; server restart နောက် session/cookie ဟောင်းမဝင်နိုင်။ | မစသေး |
| T22 | Permission၊ network၊ camera device၊ speaker နှင့် connection timeout အတွက် error/Retry state ထည့်မည် (F04, F08)။ | T14, T16, T17, T19, T20, T21 | Error matrix တွင် camera/viewer mic permission deny၊ camera မရှိ၊ internet ပြတ်၊ speaker playback fail၊ ၂၀ စက္ကန့် video timeout တစ်ခုချင်းစီအတွက် မှန်သော message/Retry ပေါ်သည်။ | မစသေး |
| T23 | Pairing/token/socket security boundary နှင့် HTTP headers/log redaction ကို စစ်မည် (F03, F06, F09)။ | T03, T09, T10, T11, T18 | Unauthoriz ed offer/ICE/alarm ကို server ပိတ်; cross-origin state change ပိတ်; Secure/HttpOnly/SameSite နှင့် Referrer-Policy မှန်; PIN/token/QR URL log မဝင်ကြောင်း စစ်ချက်ရှိသည်။ | မစသေး |
| T24 | No-recording audit ကို သီးသန့်လုပ်မည် (F09)။ | T13, T15, T17, T18, T21 | Live video၊ room audio၊ viewer talk နှင့် alarm စမ်းစဉ် app database/file/object storage/analytics/log တွင် media payload မရှိ၊ recording/snapshot/playback feature မရှိကြောင်း review မှတ်တမ်းရှိသည်။ | မစသေး |
| T25 | Responsive UI နှင့် browser/device matrix စစ်မည် (F01, F10–F12)။ | T14, T15, T17, T18, T19, T22 | Laptop Chrome/Edge၊ Android Chrome၊ iPhone Safari ပေါ် camera/viewer controls သုံးနိုင်ကြောင်း device၊ browser version၊ screenshot နှင့် pass/fail မှတ်တမ်းရှိသည်။ | မစသေး |
| T26 | Requirements F01–F12 ကို end-to-end release test ဖြင့်ပိတ်မည်။ | T21, T23, T24, T25 | Wi-Fi camera + cellular viewer ဖြင့် ၁၀ မိနစ် live ကြည့်၊ တစ်မိနစ်တစ်ကြိမ် မြင်ကွင်းလှုပ်ရှားမှုစစ်၊ viewer re-entry၊ Talk၊ Alarm၊ Stop တို့ pass ဖြစ်ပြီး F01–F12 checklist အားလုံးတွင် သက်သေရှိသည်။ | မစသေး |

**Day 2 milestone:** T26 ၏ သက်သေအားလုံးရှိမှ MVP ကို ပြီးစီးသည်ဟု သတ်မှတ်မည်။ Device/browser ပေါ် စမ်းသပ်မပြီးသော feature ကို status **ပြီး** ဟု မမှတ်ရ။

## Setup verification — ၂၀၂၆-၁၁-၁၇

- `npm.cmd run typecheck`: web နှင့် server နှစ်ခုလုံး pass။
- `npm.cmd run build`: web နှင့် server နှစ်ခုလုံး pass။
- Local server `/api/health`: HTTP 200, `{"status":"ok"}`။
- Vite development proxy `/api/health`: HTTP 200။ Socket.IO ကို proxy မှတစ်ဆင့် WebSocket ဖြင့် ချိတ်/ဖြုတ်နိုင်သည်။
- T01 ၏ Home page၊ Camera Mode နှင့် Viewer Mode route placeholder များ ရေးပြီး unit test ဖြင့်စစ်ထားသည်။ Camera access, pairing နှင့် live media မပါ။ Laptop/phone viewport ပေါ် လက်တွေ့စစ်မပြီးသေးသဖြင့် T01 ကို **ပြီး** ဟု မမှတ်ထား။

## T01 verification — ၂၀၂၆-၁၁-၁၇

- `npm.cmd run typecheck`: web နှင့် server နှစ်ခုလုံး pass။
- `npm.cmd test`: web Home page tests ၃ ခုနှင့် server health/Socket.IO tests ၂ ခု၊ စုစုပေါင်း ၅ ခု pass။
- `npm.cmd run build`: web နှင့် server နှစ်ခုလုံး pass။
- `npm.cmd run dev`: server ကို port 3000 တွင်၊ Vite web app ကို port 5174 တွင် run လုပ်ပြီး `/api/health` proxy HTTP 200 နှင့် Socket.IO WebSocket proxy connection ကို စစ်ထားသည်။ Port 5173 သည် ယခင် local dev process က အသုံးပြုထားသောကြောင့် Vite က 5174 ကို အလိုအလျောက်ရွေးခဲ့သည်။

## T01 responsive UI follow-up — ၂၀၂၆-၁၁-၁၈

- Home၊ `/camera` နှင့် `/viewer` တွင် role အလိုက် UI ကို ပြန်စီထားသည်။ Desktop တွင် role choices ကို ၂ ကော်လံ၊ `700px` အောက် phone viewport တွင် ၁ ကော်လံသို့ ပြောင်းပြီး camera/viewer screen များကိုလည်း stacked layout ပြောင်းသည်။ Camera media permission၊ pairing နှင့် live stream မထည့်ထား။ Camera screen တွင် capture မစသေးသဖြင့် **Not monitoring** ဟုသာ ပြသည်။
- `npm.cmd test`: web route/UI tests ၄ ခုနှင့် server tests ၂ ခု၊ စုစုပေါင်း ၆ ခု pass။ Camera route test က `getUserMedia()` မခေါ်ကြောင်းလည်း စစ်သည်။
- `npm.cmd run typecheck` နှင့် `npm.cmd run build`: web နှင့် server နှစ်ခုလုံး pass။
- `npm.cmd run dev`: Express server `127.0.0.1:3000` နှင့် Vite app `localhost:5173` တွင် အောင်မြင်စွာ run လုပ်ခဲ့သည်၊ ထို့နောက် test process ကိုရပ်ထားသည်။
- Chrome/Edge headless ဖြင့် `1440×900` နှင့် `390×844` visual screenshot စစ်ရန် ကြိုးစားခဲ့သော်လည်း ဤ environment ၏ browser GPU renderer က start မဖြစ်၍ screenshot မထွက်။ ထို့ကြောင့် visual viewport/device acceptance ကို pass ဟုမမှတ်ထားသေး။

## T01 user visual confirmation — ၂၀၂၆-၁၁-၁၈

- User က laptop နှင့် phone တွင် Home၊ Camera နှင့် Viewer screen များကို visual check ပြီးကြောင်း အတည်ပြုထားသည်။

## T03 deployment setup — ၂၀၂၆-၁၁-၁၈

- `deploy/Caddyfile.example` တွင် static frontend serving၊ `/api/*` reverse proxy၊ `/socket.io/*` WebSocket reverse proxy နှင့် security headers ထည့်ထားသည်။ Pairing URL များ log မဝင်စေရန် Caddy access log မဖွင့်ထား။
- `deploy/rw.service` တွင် Node server ကို `127.0.0.1:3000` မှသာ run စေပြီး systemd hardening options ထည့်ထားသည်။
- `deploy/README.md` တွင် VPS prerequisites၊ build/install၊ environment file permission၊ systemd setup၊ Caddy validate/reload နှင့် HTTPS/WSS acceptance checks ရေးထားသည်။
- `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` ကို local workspace တွင် စစ်ပြီး pass ဖြစ်သည်။ Public VPS IP၊ domain၊ SSH access မရှိသေးသဖြင့် HTTPS certificate၊ public `/api/health` နှင့် WSS handshake ကို မစစ်ရသေး။ T03 ကို **ပြီး** ဟု မမှတ်ထား။

## T03/T04 execution check — ၂၀၂၆-၁၁-၁၈

အောက်ပါ VPS blocker notes များသည် အစောပိုင်းစစ်ချက်မှတ်တမ်းဖြစ်သည်။ လက်ရှိ free-provider ရွေးချယ်မှုနှင့် နောက်ဆုံးရလဒ်ကို အောက်ဆုံး section တွင် ဖတ်ရန်။

- Local workspace တွင် `.env` မရှိဘဲ `.env.example` သာရှိသည်။ Target VPS hostname/IP၊ domain နှင့် SSH key path မပေးထားသေး။
- Local tools စစ်ရာတွင် `ssh` client သာရှိပြီး Caddy၊ coturn နှင့် Docker မရှိ။ ထို့ကြောင့် public HTTPS certificate၊ `/api/health`၊ `/camera`၊ `/viewer`၊ WSS handshake နှင့် TURN `relay` candidate များကို စမ်းသပ်ရန် endpoint မရှိ။
- T04 သည် T03 ကို မှီခိုသောကြောင့် coturn install/configuration ကို မစတင်ရသေး။
- `deploy/coturn.conf.example` တွင် UDP `3478`၊ relay range `49152-65535`၊ shared-secret authentication နှင့် live-relay-only logging rules ကို placeholder အဖြစ် initialize လုပ်ထားသည်။ Actual coturn install၊ firewall၊ credential expiry နှင့် `relay` candidate test မလုပ်ရသေး။
- `npm.cmd run dev` ကို run လုပ်ရာတွင် local port `3000` သည် အခြား process အသုံးပြုနေသောကြောင့် backend အသစ်က bind မလုပ်နိုင်ခဲ့သော်လည်း ရှိပြီးသား backend health က `200 / {"status":"ok"}` ပြန်သည်။ Vite သည် `5174` တွင် run ပြီး `/`, `/camera`, `/viewer` သုံးခုလုံး HTTP `200` ပြန်သည်။ ဒီ local process ကို စမ်းပြီးရပ်ထားသည်။
- T03/T04 config preflight သည် required files နှင့် Caddy/systemd/coturn mandatory directives အားလုံးတွေ့၍ pass ဖြစ်သည်။ Caddy/coturn CLI မရှိသဖြင့် actual syntax, public certificate, WSS နှင့် TURN allocation ကို pass ဟု မဆိုထား။

## Free deployment setup — ၂၀၂၆-၁၁-၁၈

- User က domain မဝယ်ဘဲ free deploy ရွေးထားသည်။ `render.yaml` တွင် Node Free service, managed provider URL, build/start, host နှင့် health check configure လုပ်ထားသည်။ Blueprint ကို Render server က validate/deploy မလုပ်ရသေး။
- `SERVE_WEB=true` ဖြင့် Express က built frontend `/`, `/camera`, `/viewer` ကို serve လုပ်ပြီး privacy headers ထည့်သည်။ Backend API/Socket.IO ကို same-origin သုံးသည်။
- `npm.cmd run typecheck`, `npm.cmd test` (web ၄ + server ၄ = ၈ tests), `npm.cmd run build` pass ဖြစ်သည်။
- Production build ကို `127.0.0.1:3015` တွင် run ပြီး `npm.cmd run check:deploy -- --local http://127.0.0.1:3015` ဖြင့် JSON health, app routes သုံးခုနှင့် Socket.IO **WS** handshake pass။ Public HTTPS/WSS သို့မဟုတ် phone browser test မဟုတ်။ HTTP ကို `--local` မပါဘဲ reject လုပ်ကြောင်း guard test pass။
- Caddy SPA fallback/API rewrite order ကို exclusive `handle` blocks ဖြင့် ပြင်ထားပြီး coturn template မှ deprecated option ကို ပြင်ထားသည်။ Caddy/coturn runtime test မလုပ်ရသေး။
- Render integration ကို ရှာတွေ့ပြီး connection အတွက် ရွေးချယ်စရာပေးထားသည်။ Account connection မအတည်ပြုရသေး၊ Git remote မရှိ၊ public URL မရသေး။
- T04 အတွက် managed TURN account, private API access, ၁ နာရီ expiry support, quota/retention review နှင့် valid/invalid credential relay test ကျန်သည်။ Free tier ကို unlimited သို့မဟုတ် recording-free အဖြစ် အတည်မပြုရသေး။
- နောက်တစ်ဆင့်: Render ချိတ်ပြီး source repo ဖြင့် Free deploy → public HTTPS/WSS + laptop/phone acceptance → managed TURN acceptance → T05။ Checklist: [deployment-checklist.md](deployment-checklist.md)။

## Render connection check — ၂၀၂၆-၁၁-၁၈

- Integration discovery စစ်ရာတွင် Render သည် available ဖြစ်ပြီး installed/connected မအတည်ပြုရသေး။ Local Git remote လည်း မရှိသေး။ Account connection နှင့် repository URL ကို user ထံတောင်းထားသည်။
- `deploy/README.md` တွင် integration authorization၊ Git access၊ New → Blueprint၊ Free plan review၊ Live URL နှင့် acceptance checks အစဉ်လိုက်ရေးထားသည်။
- ဤစစ်ချက်တွင် cloud resource မဖန်တီး၊ public deploy မလုပ်ရသေး။ T03 public HTTPS/WSS နှင့် T04 TURN allocation acceptance မပြီးသေး။

## GitHub source target — ၂၀၂၆-၁၁-၁၈

- User က `https://github.com/jzan833/RW.git` ကို deployment source အဖြစ်ပေးထားသည်။ `git ls-remote` အောင်မြင်ပြီး HEAD/main/master refs မရှိသေးကြောင်း စစ်တွေ့သည်။
- Local source ကို verification/credential-pattern scan ပြီးမှ push လုပ်ရန် ပြင်ဆင်သည်။ Render integration သည် discovery စစ်ချိန်တွင် connected မဖြစ်သေး။ Public deploy/HTTPS/WSS/TURN acceptance မပြီးသေး။

## GitHub source publication — ၂၀၂၆-၁၁-၁၈

- `origin` ကို user ပေးထားသော `https://github.com/jzan833/RW.git` သို့ ချိတ်ထားသည်။ `2fc010d` (`feat: prepare RW free deployment`) ကို `main` branch ပေါ် push အောင်မြင်ပြီး upstream `origin/main` ချိတ်ထားသည်။
- Push မလုပ်မီ `npm.cmd run typecheck`, `npm.cmd test` (၈ tests), `npm.cmd run build`, credential-pattern scan နှင့် tracked local-file check pass။ Pattern scan သည် credentials အားလုံးမရှိကြောင်း အပြည့်အစုံအာမခံခြင်းမဟုတ်။
- Render account integration မချိတ်ရသေးသောကြောင့် service creation/deploy မလုပ်ရသေး။ Next: Render → New → Blueprint → jzan833/RW → main/render.yaml → Free → Deploy Blueprint။ Public URL ရမှ HTTPS/WSS နှင့် laptop/phone acceptance ဆက်စစ်ရန်။
