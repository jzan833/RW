# RW MVP — Project Plan

ဤအစီအစဉ်သည် [requirements.md](requirements.md) ရှိ F01–F12၊ [architecture.md](architecture.md) နှင့် [security.md](security.md) ကို အခြေခံသည်။ ၂ ရက် MVP အတွက် task တစ်ခုစီကို သီးသန့်ပြီးကြောင်းစစ်နိုင်အောင် ခွဲထားသည်။ Status ကို setup နှင့် verification တိုးတက်မှုအလိုက် အောက်ပါဇယားတွင် update လုပ်ထားသည်။

**Status အသုံးပြုပုံ:** မစသေး → လုပ်ဆောင်နေ → ပြီး (အောက်ပါသက်သေရှိမှ)။ မှီခို task မပြီး၍ သို့မဟုတ် ပြင်ပအခြေအနေကြောင့် မဆက်နိုင်လျှင် **ပိတ်ဆို့နေ** ဟုမှတ်ပြီး အကြောင်းရင်းထည့်ရမည်။ `—` သည် မှီခို task မရှိဟု ဆိုလိုသည်။ Test သက်သေတွင် အသုံးပြုသော browser/device၊ network၊ ရလဒ်နှင့် screenshot/log အတိုချုံးကို မှတ်ထားရမည်။

## Day 1 — Camera မှ viewer ဆီ live video ရောက်စေခြင်း

| ID | လုပ်မည့်အရာ | မှီခိုတဲ့ task | ပြီးကြောင်းသက်သေ | Status |
| --- | --- | --- | --- | --- |
| T00 | Viewer cookie `Max-Age` နှင့် အများဆုံး supported monitoring duration ကို ဆုံးဖြတ်ပြီး requirements/security docs နှစ်ခုလုံးတွင် တူညီစွာရေးမည်။ | — | Docs နှစ်ခုတွင် numeric expiry တစ်ခုတည်းရှိပြီး active session အတွင်း re-entry စည်းကမ်း မဆန့်ကျင်ကြောင်း review လုပ်ပြီးမှတ်ထားသည်။ | မစသေး |
| T01 | React + TypeScript + Vite frontend အခြေခံနှင့် camera/viewer screen route များ တည်ဆောက်မည်။ | — | Frontend build အောင်မြင်ပြီး laptop/phone viewport နှစ်ခုတွင် role screen နှစ်ခု ဖွင့်နိုင်သည်။ | လုပ်ဆောင်နေ — Home/role routes နှင့် local runtime test ပြီး၊ laptop/phone viewport လက်တွေ့စစ်ရန် ကျန် |
| T02 | Node + Express + Socket.IO backend အခြေခံနှင့် health endpoint တည်ဆောက်မည်။ | — | Local health request အောင်မြင်၊ Socket.IO client တစ်ခု ချိတ်/ဖြုတ်နိုင်ပြီး server error မရှိ။ | ပြီး |
| T03 | VPS ပေါ် Caddy HTTPS/WSS ဖြင့် frontend နှင့် backend ကို public domain မှ ဝင်နိုင်အောင် deploy လုပ်မည်။ | T01, T02 | Laptop နှင့် phone မှ HTTPS certificate မှန်ကန်စွာ site ဖွင့်နိုင်ပြီး health API နှင့် WSS handshake အောင်မြင်သည်။ | မစသေး |
| T04 | coturn STUN/TURN server နှင့် public ports/firewall၊ test အတွက် short-lived credentials ကို ပြင်ဆင်မည်။ | T03 | Test client မှ STUN candidate နှင့် TURN `relay` candidate ရသည်; credential မရှိလျှင် TURN allocation မရ။ | မစသေး |
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
