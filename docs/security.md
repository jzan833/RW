# RW MVP — Security and Privacy Rules

RW တွင် account မရှိသောကြောင့် **QR + PIN ဖြင့် pair လုပ်ထားခြင်း** ကို session ကြည့်ခွင့်အဖြစ် သတ်မှတ်သည်။ Browser UI ပေါ် ခလုတ်ဖျောက်ထားခြင်းအစား backend က API နှင့် Socket.IO action တိုင်း၏ role/permission ကို စစ်ရမည်။ ဤစည်းကမ်းများသည် [requirements.md](requirements.md) ၏ F02, F03, F06, F07, F09, F11, F12 ကို အကောင်အထည်ဖော်ရန်ဖြစ်သည်။

## Pairing

1. Camera က **Start Monitoring** နှိပ်သောအခါ server က random, ခန့်မှန်းရန်ခက်သော invite ID ကို QR link ထဲထည့်မည်။ PIN သည် QR ထဲမပါဘဲ camera screen တွင် သီးခြားပြသော random ၆ လုံးနံပါတ် ဖြစ်မည်။
2. PIN ကို server memory ထဲ plain text မထားဘဲ server secret ဖြင့် verifier/HMAC ပုံစံသာထားမည်။ Browser မှလာသော PIN ကို server က timing-safe comparison ဖြင့် စစ်မည်။
3. Invite တစ်ခုသည် ထုတ်ပြီး **၅ မိနစ်** အထိသာ valid ဖြစ်မည်။ Pair အောင်မြင်ပြီးလျှင် **single-use** အဖြစ် ချက်ချင်းပိတ်မည်။ QR link တစ်ခုတည်းဖြင့် video၊ signaling သို့မဟုတ် alarm command မရ။
4. Viewer slot ကို server က session တစ်ခုလျှင် **active ၁ ခု** အဖြစ် ထိန်းမည်။ Pair လုပ်ပြီးသား viewer credential တစ်ခုတည်း၏ re-entry ကို stale connection အစားထိုး၍ ခွင့်ပြုမည်။ အခြား browser ကို ဒုတိယ viewer အဖြစ် မခွင့်ပြု။

## Token နှင့် expiry

| Credential / state | ဘယ်နေရာမှာရှိသလဲ | ဘယ်အချိန်ပျက်သလဲ |
| --- | --- | --- |
| Camera role token | Camera tab memory နှင့် server တွင် token verifier | Camera က Stop နှိပ်ခြင်း၊ tab ပိတ်ပြီး reconnect grace period ကုန်ခြင်း သို့မဟုတ် server restart |
| QR invite + PIN | Camera screen; server တွင် invite/PIN verifier | ထုတ်ပြီး ၅ မိနစ်၊ pair အောင်မြင်ချိန်၊ မှား ၅ ကြိမ်ပြည့်ချိန် သို့မဟုတ် camera session ရပ်ချိန် |
| Viewer token | Browser ၏ persistent **Secure, HttpOnly, SameSite=Strict** cookie; server တွင် token verifier | Camera session ရပ်/ပျက်ချိန် သို့မဟုတ် server restart တွင် server က ချက်ချင်း reject လုပ်မည်။ Browser cookie ကို နောက် response တွင် ဖျက်မည်။ Browser data ဖျက်လျှင်လည်း token ပျောက်မည်။ |
| TURN credential | Backend က ခွင့်ပြုထားသော camera/viewer ကိုသာ ခဏပေးသည် | ၁ နာရီ သက်တမ်း; active session အတွက် မကုန်မီ credential အသစ်ပေးပြီး လိုလျှင် ICE ကိုပြန်ညှိမည်။ Session ရပ်လျှင် အသစ်မထုတ်။ |

Viewer cookie သည် browser ပိတ်ပြီးပြန်ဖွင့်ရာတွင် ကျန်နိုင်ရန် **persistent cookie** ဖြစ်ရမည်။ Cookie ၏ `Max-Age` ကို supported monitoring duration ထက် မတိုအောင် သတ်မှတ်ပြီး server-side session revocation ကို access ဆုံးဖြတ်ချက်၏ အဓိကအရင်းအမြစ်အဖြစ် သုံးမည်။ Session duration အတွက် hard cap ကို requirements တွင် မသတ်မှတ်ရသေးသောကြောင့် numeric `Max-Age` ကို implementation မစမီ ထပ်သတ်မှတ်ရမည်။ Browser က cookie ဖျက်ခြင်း သို့မဟုတ် private browsing data ပျောက်ခြင်းတွင် QR/PIN အသစ်လိုမည်။ [MDN secure cookies](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)

Camera connection ပြတ်လျှင် server က viewer ဆီ **Monitoring Interrupted** status ပို့ပြီး camera tab ကို **၃၀ စက္ကန့်** reconnect grace period ပေးမည်။ တူညီသော camera tab/token ပြန်ချိတ်လျှင် session ဆက်ပြီး WebRTC ကို အသစ်ညှိမည်။ Grace period ကုန်လျှင် session အဆုံးသတ်ပြီး token များကို revoke လုပ်မည်။ Camera tab ပိတ်ပြီး နောက်မှ ပြန်ဖွင့်ခြင်းသည် session အသစ်လိုသည်။ Viewer ပြန်ဝင်ချိန်တွင် cookie တစ်ခုတည်းကို မယုံဘဲ camera session အသက်ရှိမှုကို server က ပြန်စစ်ရမည်။

## Rate limit နှင့် abuse control

- PIN မှား **၅ ကြိမ်** ပြည့်လျှင် ထို invite ကို invalidate လုပ်မည်။ Camera ဘက်မှ invite အသစ်ထုတ်မှသာ ထပ် pair လုပ်နိုင်မည်။
- Pairing API ကို invite တစ်ခုချင်းအပြင် source IP အလိုက်လည်း ကန့်သတ်မည်။ MVP default အဖြစ် IP တစ်ခုမှ **၅ မိနစ်အတွင်း pair request ၂၀ ကြိမ်ထက်မပို** စေရ။ Invite အသစ်ထုတ်ခြင်းကို camera session တစ်ခုလျှင် **၁ မိနစ် ၃ ကြိမ်ထက်မပို** စေရ။
- PIN မှားခြင်း၊ invite မရှိခြင်း၊ invite expiry ဖြစ်ခြင်းတို့တွင် session ရှိ/မရှိ ခန့်မှန်းလွယ်သော error အသေးစိတ် မဖော်ပြရ။ Backend က message size နှင့် data shape ကို validation လုပ်ရမည်။
- Viewer token မရှိ/မမှန်လျှင် Socket.IO room၊ offer/answer၊ ICE candidate၊ Hold to Talk၊ alarm command များကို server က reject လုပ်ရမည်။ TURN credential ရခြင်းသည် RW viewer ခွင့်ပြုချက် မဟုတ်။

## Security boundary

- Public network ပေါ် website/API/Socket.IO ကို HTTPS/WSS ဖြင့်သာ ပေးမည်။ Camera/microphone permission ကို browser က user ထံ တောင်းရမည်။ [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- Viewer cookie ကို JavaScript မဖတ်နိုင်သော `HttpOnly`၊ HTTPS ပေါ်သာပို့သော `Secure`၊ cross-site request ကို ကန့်သတ်သော `SameSite=Strict` နှင့် host-only scope ဖြင့် သတ်မှတ်မည်။ State ပြောင်းသည့် request များတွင် Origin/CSRF စစ်ဆေးမှုလည်း ရှိရမည်။
- PIN၊ role token၊ viewer cookie၊ TURN shared secret နှင့် WebRTC signaling payload ကို application/access log ထဲ မရေးရ။ QR invite ID ပါသော URL path/query ကို Caddy access log မှ ဖယ်ရှား သို့မဟုတ် redact လုပ်ရမည်။ Pairing page တွင် third-party asset မတင်ဘဲ `Referrer-Policy: no-referrer` ထားရမည်။ Secret များကို server environment တွင်သာထားရမည်။
- WebRTC media transport သည် encrypted ဖြစ်သည်။ TURN လိုအပ်လျှင် coturn က relay လုပ်နိုင်သော်လည်း app backend သို့ decoded video/audio မပို့ရ။ [MDN DTLS/WebRTC](https://developer.mozilla.org/en-US/docs/Glossary/DTLS)

## Visible monitoring

- Camera capture အလုပ်လုပ်ပြီး signaling service နှင့်ချိတ်ထားသောအချိန်မှသာ camera screen တွင် **Monitoring Active** ကို ထင်ရှားစွာပြရမည်။ Viewer မရှိသော်လည်း capture လုပ်နေပါက **0 viewers** ကို သီးခြားပြရမည်။
- Camera/mic capture၊ viewer count၊ viewer talk status နှင့် **Stop Monitoring** ကို camera screen ပေါ်မြင်နိုင်ရမည်။ Viewer အသံ/alarm အတွက် **Enable Speaker / Speaker Ready** status ကိုပြရမည်။
- Camera track ရပ်၊ permission ပြန်ရုပ်သိမ်း၊ network/signaling ပျက်လျှင် **Monitoring Active** ကို ဆက်မပြဘဲ **Monitoring Interrupted** ပြရမည်။ User က Stop နှိပ်လျှင် capture tracks များကိုရပ်ပြီး server session ကို revoke လုပ်ရမည်။
- Phone camera အတွက် screen ဖွင့်၍ RW tab foreground တွင်ထားရမည်။ Phone lock/background တွင် monitoring ဆက်လုပ်မည်ဟု MVP က အာမမခံ။

## No recording rules

- RW သည် `MediaRecorder`၊ screenshot/snapshot capture၊ playback/history feature မထည့်ရ။ Video/audio payload ကို server database၊ file storage၊ object storage၊ analytics သို့မဟုတ် application log ထဲ မရေးရ။ Viewer → camera voice လည်း ထိုစည်းကမ်းတူညီသည်။
- coturn ကို **live relay only** အဖြစ် configure လုပ်ရမည်။ Media packet contents ကို persistent log သို့မဟုတ် recording အဖြစ် မသိမ်းရ။ Network/browser ၏ ယာယီ buffer သည် live transport အတွက်သာဖြစ်သည်။
- Alarm သည် camera device တွင် သတ်မှတ်ထားသောအသံကို ချက်ချင်းဖွင့်ခြင်းသာဖြစ်ပြီး voice message သိမ်းခြင်း မဟုတ်။ Alarm ack သည် browser က playback စတင်ကြောင်းသာ အတည်ပြုနိုင်သည်; speaker volume/silent mode ကြောင့် လူက တကယ်ကြားသလားကို web app က မတိုင်းတာနိုင်။

Media နှင့် signaling လမ်းကြောင်းကို [data-flow.md](data-flow.md) တွင်၊ deployment ပုံစံကို [architecture.md](architecture.md) တွင် ဖော်ပြထားသည်။
