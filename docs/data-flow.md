# RW MVP — Data Flow

ဤစာတမ်းသည် camera ဖွင့်ခြင်းမှ viewer ဆီ live video ရောက်ခြင်းအထိ အစဉ်လိုက်ဖော်ပြသည်။ ခွင့်ပြုချက်နှင့် token များ၏ အသေးစိတ်ကို [security.md](security.md) တွင် ဖော်ပြထားသည်။

## Camera မှ viewer ထိ အစဉ်လိုက်

| အဆင့် | ဘာဖြစ်သလဲ | ဘယ်လမ်းကြောင်းသုံးသလဲ |
| --- | --- | --- |
| 1 | Camera device တွင် RW ကို HTTPS ဖြင့်ဖွင့်ပြီး **Use as Camera** ကိုရွေးသည်။ | Browser ← Caddy |
| 2 | Browser က camera permission တောင်းသည်။ User ခွင့်ပြုပြီးနောက် local preview ပေါ်သည်။ Camera mic သည် default **Off** ဖြစ်သည်။ | Camera hardware → camera browser |
| 3 | User က **Start Monitoring** နှိပ်သည်။ Browser က Node backend မှ monitoring session အသစ်တောင်းသည်။ Backend က ခန့်မှန်းရန်ခက်သော session/invite ID၊ ၆ လုံး PIN၊ ၅ မိနစ် expiry ထုတ်ပြီး ယာယီမှတ်ထားသည်။ | Camera browser → HTTPS API → backend memory |
| 4 | Camera screen တွင် **Monitoring Active**၊ preview၊ viewer count **0**၊ QR link နှင့် PIN သီးခြားပေါ်သည်။ User က **Enable Speaker** နှိပ်၍ viewer အသံ/alarm ထွက်နိုင်မှုကို စစ်သည်။ | Backend → camera browser; speaker သည် camera device ပေါ်တွင်သာ |
| 5 | Viewer phone က QR ကို scan လုပ်၍ RW pair screen ဖွင့်ပြီး PIN ထည့်သည်။ Camera နှင့် viewer သည် Wi-Fi/cellular မတူနိုင်သည်။ | Viewer browser → HTTPS API |
| 6 | Backend က invite သက်တမ်း၊ PIN၊ attempt count၊ viewer slot ကို စစ်သည်။ မှန်လျှင် invite ကို single-use အဖြစ်ပိတ်၊ viewer credential cookie ပေးပြီး viewer role ကို သတ်မှတ်သည်။ | Backend memory → HTTPS response → viewer browser |
| 7 | Camera နှင့် viewer တို့က Socket.IO သို့ ချိတ်သည်။ Backend က session/role ကိုစစ်ပြီး နှစ်ဖက်အကြား WebRTC offer၊ answer နှင့် ICE candidates များကိုသာ relay လုပ်သည်။ | Browser ↔ WSS/Socket.IO ↔ backend |
| 8 | Browser နှစ်ခုက STUN ဖြင့် direct network path ရှာသည်။ Direct path မရလျှင် coturn TURN relay path ကို ရွေးသည်။ | Browser ↔ STUN/TURN ↔ browser |
| 9 | WebRTC connection တည်ဆောက်ပြီးနောက် camera video track သည် viewer ဆီ live ရောက်သည်။ Camera mic ကို ဖွင့်ထားမှသာ room audio track ပါသည်။ Node backend သည် media payload ကို မယူ။ | Camera browser ↔ viewer browser; လိုအပ်လျှင် coturn relay |
| 10 | Viewer တွင် **Live** နှင့် လှုပ်ရှားနေသော video ပေါ်သည်။ Camera တွင် **1 viewer connected** ပေါ်သည်။ Frame ရပ်သွားလျှင် **Live** ကို ဆက်မပြဘဲ connection status ပြောင်းသည်။ | Browser UI နှစ်ဖက် |

## Viewer အသံနှင့် alarm

1. **Hold to Talk:** Viewer က mic permission မရှိသေးပါက တောင်းသည်။ ခလုတ်ကို နှိပ်ထားစဉ်သာ viewer mic audio ကို WebRTC ဖြင့် camera ဆီ ပို့သည်။ လွှတ်ခြင်း၊ disconnect သို့မဟုတ် Stop Viewing တွင် mic capture/publish ရပ်သည်။ Camera ဘက် **Speaker Ready** လိုသည်။
2. **Sound Alarm:** Viewer က Socket.IO ဖြင့် authenticated alarm command ပို့သည်။ Backend က viewer role နှင့် live session ကို စစ်ပြီး camera ဆီ relay လုပ်သည်။ Camera browser က local alarm အသံ ၅ စက္ကန့်ဖွင့်ပြီး playback စတင်ကြောင်း ack ပြန်သည်။ Viewer တွင် ack ရမှ **Alarm playing** ပြသည်။ အသံဖွင့်မရလျှင် **Alarm failed** ပြသည်။

## ထွက်ခြင်းနှင့် ပြန်ဝင်ခြင်း

1. Viewer က app ကို background ပို့၊ tab/browser ပိတ် သို့မဟုတ် **Stop Viewing** နှိပ်လျှင် viewer media connection ပိတ်သည်။ Camera capture ဆက်ရှိပြီး viewer count **0** ပြန်ဖြစ်သည်။
2. တူညီသော browser မှ RW ကိုပြန်ဖွင့်လျှင် persistent viewer cookie ကို backend ထံပို့သည်။ Backend က camera session အသက်ရှိမှုနှင့် viewer credential ကို ပြန်စစ်သည်။
3. Valid ဖြစ်လျှင် stale viewer connection ကိုပိတ်၊ viewer slot ကို ပြန်ပေးပြီး **WebRTC negotiation အသစ်** လုပ်သည်။ QR/PIN ထပ်မလို။ Camera session ပျက်လျှင် **Monitoring ended** ပြ၍ pair အသစ်လိုသည်။
4. Camera က **Stop Monitoring** နှိပ်၊ camera tab ပိတ် သို့မဟုတ် server restart ဖြစ်လျှင် session အဆုံးသတ်သည်။ Viewer stream၊ talk နှင့် alarm ရပ်ပြီး token ကို server က ပယ်ဖျက်သည်။

## Server ထဲတွင် ဘာတွေဖြတ်သန်းသလဲ

| Data | Backend/relay ထိရောက်သလား | သိမ်းသလား |
| --- | --- | --- |
| QR invite, PIN verifier, viewer credential verifier, connection status | Backend ထိရောက်သည် | Session အသက်ရှင်စဉ် memory ထဲ ယာယီသာ |
| WebRTC offer/answer နှင့် ICE candidates | Backend မှ ခဏ relay လုပ်သည် | Persistent storage/log မလုပ် |
| Video နှင့် live voice | Node backend ထဲ မဝင်။ Direct path သို့မဟုတ် coturn relay မှ ဖြတ်သည် | App နှင့် coturn က recording မလုပ် |
| Alarm command/ack | Backend မှ relay လုပ်သည် | Persistent storage မလုပ် |

Browser နှင့် network layer တွင် live ပို့ရန် ယာယီ buffer များရှိနိုင်သည်။ ယင်းတို့ကို RW ၏ recording/history အဖြစ် မသိမ်း။
