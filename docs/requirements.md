# RW MVP — Requirements

## ရည်ရွယ်ချက်နှင့် scope

အခန်းထဲတွင်ထားသော laptop သို့မဟုတ် phone တစ်လုံး၏ camera ကို အခြား internet connection သုံးနေသော phone တစ်လုံးမှ live ကြည့်နိုင်ရန် web application တည်ဆောက်မည်။ MVP ကို ၂ ရက်အတွင်း စမ်းသပ်နိုင်သောအဆင့် ရောက်စေရန် ရည်ရွယ်သည်။ တစ်ချိန်လျှင် camera ၁ လုံး၊ viewer ၁ လုံးသာ ချိတ်မည်။ User account၊ AI၊ video/audio recording မပါ။

## အဓိက user flow

1. Camera device တွင် RW ကို HTTPS ဖြင့်ဖွင့်ပြီး **Use as Camera** ကိုရွေးသည်။ Camera permission ပေးပြီး preview ကြည့်သည်။ Microphone ကို မူလအားဖြင့်ပိတ်ထားပြီး လိုမှဖွင့်သည်။
2. **Start Monitoring** နှိပ်လျှင် camera capture စတင်ပြီး screen တွင် **Monitoring Active**၊ preview၊ viewer status၊ QR၊ သီးခြား PIN နှင့် **Stop Monitoring** ကိုပြသည်။ Camera device မှ viewer အသံနှင့် alarm ထွက်စေရန် **Enable Speaker** ကိုနှိပ်ပြီး speaker status ကိုစစ်သည်။
3. Viewer phone က QR ကို scan လုပ်ပြီး PIN ရိုက်သည်။ အတည်ပြုပြီးလျှင် **Connecting** မှ **Live** သို့ပြောင်းကာ video နှင့် camera ဘက်မှဖွင့်ထားပါက audio ကိုရသည်။ Live screen မှ **Hold to Talk** သို့မဟုတ် **Sound Alarm** ကိုသုံးနိုင်သည်။
4. Viewer က RW ကို background ပို့၊ tab/browser ပိတ်၊ သို့မဟုတ် refresh လုပ်ပြီး တူညီသော browser မှ ပြန်ဖွင့်လျှင် session အသက်ရှိနေသရွေ့ QR/PIN ထပ်မရိုက်ဘဲ live ပြန်ချိတ်သည်။ Viewer ထွက်နေစဉ် camera က monitoring ဆက်လုပ်ပြီး **0 viewers** ပြသည်။
5. Camera ဘက်မှ **Stop Monitoring** နှိပ်လျှင် capture နှင့် session အဆုံးသတ်သည်။ Viewer ဘက်မှ **Stop Viewing** နှိပ်လျှင် viewer သာထွက်သည်။

## Functional features နှင့် acceptance criteria

### F01 — Camera device စတင်ခြင်း

- Laptop browser နှင့် phone browser နှစ်မျိုးလုံးတွင် **Use as Camera** ကိုရွေးနိုင်ရမည်။
- Camera permission မရမချင်း capture မစရ၊ permission ပယ်ချလျှင် ပြန်စမ်းရန်ညွှန်ကြားချက် ပြရမည်။
- Permission ရပြီးလျှင် local preview တွင် camera ပုံပေါ်ရမည်။ Camera မရှိခြင်း သို့မဟုတ် အခြား app က အသုံးပြုနေခြင်းအတွက် သီးခြား error ပြရမည်။
- Camera capture အတွက် HTTPS သုံးရမည်။

### F02 — Monitoring screen နှင့် status

- **Start Monitoring** ပြီး local capture အလုပ်လုပ်ပြီး server နှင့်ချိတ်ထားစဉ် camera screen တွင် **Monitoring Active** ကို ထင်ရှားစွာပြရမည်။
- Screen တွင် local preview၊ **0 viewers / 1 viewer connected**၊ **Stop Monitoring** တို့ကို မြင်နိုင်ရမည်။ Viewer မရှိသေးစဉ်လည်း monitoring status ပြရမည်။
- Capture ရပ်သွားခြင်း သို့မဟုတ် connection ပြတ်ခြင်းကို သိရှိလျှင် **Monitoring Active** ကို ဆက်မပြဘဲ **Monitoring Interrupted** နှင့် ပြန်စမ်းရန်လုပ်ဆောင်ချက် ပြရမည်။

### F03 — QR + PIN pairing

- Camera screen တွင် session အတွက် QR link နှင့် သီးခြား ၆ လုံး PIN ပြရမည်။ QR link တစ်ခုတည်းဖြင့် live stream မကြည့်နိုင်ရ။
- Pair မလုပ်ရသေးသော PIN သက်တမ်း ၅ မိနစ်ရှိရမည်။ သက်တမ်းကုန်လျှင် camera ဘက်မှ invite အသစ်ထုတ်နိုင်ရမည်။
- PIN မှား ၅ ကြိမ်ဆက်တိုက်ကြိုးစားလျှင် ထို invite ကို ပိတ်ပြီး camera ဘက်မှ invite အသစ်ထုတ်မှသာ ပြန် pair လုပ်နိုင်ရမည်။
- Pair အောင်မြင်ပြီးလျှင် ထို invite ကို အခြား browser/device မှ အသုံးပြု၍ မရတော့ရ။

### F04 — Remote live viewing

- Camera ကို Wi-Fi၊ viewer ကို cellular data ပေါ်ထားသည့် လက်တွေ့စမ်းသပ်မှုတွင် QR + PIN ဖြင့် stream ချိတ်နိုင်ရမည်။
- Pair အောင်မြင်ပြီးနောက် viewer တွင် **Connecting**၊ **Live**၊ **Disconnected** status များကို မှန်ကန်စွာပြရမည်။ စမ်းသပ်ချိတ်ဆက်မှုတွင် ၂၀ စက္ကန့်အတွင်း ပုံပေါ်ရမည် သို့မဟုတ် error နှင့် **Retry** ပြရမည်။
- Wi-Fi camera + cellular viewer ဖြင့် ၁၀ မိနစ် ဆက်တိုက်ကြည့်ပြီး တစ်မိနစ်တစ်ကြိမ် မြင်ကွင်းအတွင်း လှုပ်ရှားမှုကို စစ်ရမည်။ ပုံရပ်သွားလျှင် frozen ပုံကို **Live** ဟုမပြရ။
- Viewer မှ camera သို့ **Hold to Talk** အသံနှင့် **Sound Alarm** အမိန့်သာ ပို့နိုင်ရမည်။ Camera လှည့်ခြင်း၊ zoom/flash ပြောင်းခြင်း မရှိရ။

### F05 — One-way live audio

- Camera ဘက် microphone သည် မူလအားဖြင့် **Off** ဖြစ်ရမည်။ User က ဖွင့်မှသာ microphone permission တောင်းပြီး audio ပို့ရမည်။
- Mic **Off** ဖြစ်စဉ် viewer ဆီ audio track မပို့ရ။ Mic **On** ဖြစ်စဉ် viewer က audio ကြားနိုင်ရမည်။ Browser က playback gesture လိုလျှင် viewer တွင် **Tap to hear audio** ပြရမည်။
- Viewer microphone permission ကို **Hold to Talk** သုံးသည့်အခါမှသာ တောင်းရမည်။ Camera → viewer audio ကို microphone toggle ဖြင့် ဆက်ထိန်းချုပ်နိုင်ရမည်။

### F06 — Viewer တစ်ဦးတည်းနှင့် ပြန်ဝင်ခြင်း

- Session တစ်ခုတွင် တစ်ချိန်တည်း active viewer connection ၁ ခုသာ ရှိရမည်။ ဒုတိယ viewer ဝင်လျှင် **Viewer already connected** ပြပြီး stream မပေးရ။
- Pair လုပ်ပြီးသား viewer က RW ကို background ပို့ပြီး foreground ပြန်ဝင်ခြင်း၊ tab/browser ပိတ်ပြီး တူညီသော browser မှ RW ကိုပြန်ဖွင့်ခြင်း၊ သို့မဟုတ် refresh လုပ်ခြင်းတို့တွင် session အသက်ရှိနေသရွေ့ QR/PIN ထပ်မလိုဘဲ live ပြန်ချိတ်နိုင်ရမည်။
- Viewer ပြန်ဝင်လျှင် ပျက်နေသော connection ဟောင်းကို အစားထိုးပြီး active viewer connection ၁ ခုသာ ကျန်ရမည်။ စမ်းသပ်ချိတ်ဆက်မှုတွင် ၃၀ စက္ကန့်အတွင်း live ပြန်ပေါ်ရမည် သို့မဟုတ် error နှင့် **Retry** ပြရမည်။
- Session link ကိုသာ အခြား device တွင်ဖွင့်ရုံဖြင့် stream မကြည့်နိုင်ရ။ Browser data ဖျက်ပြီးပါက QR/PIN ဖြင့် အသစ် pair လုပ်ရမည်။
- Camera ဘက်မှ session ရပ်လျှင် viewer ပြန်ဝင်ခွင့် ပျက်ရမည်။

### F07 — Stop နှင့် session lifecycle

- Camera ဘက်မှ **Stop Monitoring** နှိပ်လျှင် camera/mic capture ရပ်၊ viewer stream ပြတ်၊ QR/PIN နှင့် viewer credential ပျက်ရမည်။ Viewer တွင် **Monitoring ended** ပြရမည်။
- Viewer ဘက်မှ **Stop Viewing** နှိပ်လျှင် viewer connection နှင့် viewer microphone ပိတ်ပြီး camera monitoring ဆက်ရှိရမည်။ Camera တွင် **0 viewers** ပြန်ပြရမည်။ Pair လုပ်ထားသော browser မှ session အသက်ရှိနေသရွေ့ ပြန်ဝင်နိုင်ရမည်။
- Camera tab ပိတ်ခြင်း သို့မဟုတ် device shutdown ဖြစ်လျှင် viewer တွင် ၃၀ စက္ကန့်အတွင်း connection ပျက်ကြောင်း ပြရမည်။ Server restart ဖြစ်လျှင် session ဟောင်း မဝင်နိုင်တော့ရ။ ပြန်စရန် camera device မှ monitoring အသစ်စရမည်။

### F08 — Connection နှင့် device error handling

- Internet ပြတ်သွားလျှင် နှစ်ဖက်လုံးတွင် **Disconnected / Monitoring Interrupted** ကိုပြပြီး ပြန်ချိတ်ရန်လုပ်ဆောင်ချက် ပေးရမည်။
- Camera permission ပြန်ရုပ်သိမ်းခြင်း၊ camera device ပြတ်ခြင်း၊ browser က capture ရပ်ခြင်းတို့တွင် အခြေအနေကို သိရှိပြီး active status မပြတော့ရ။
- အမှားကြောင့် stream မစနိုင်လျှင် viewer က ဘာဖြစ်နေသည်ကို သိနိုင်သော message ရရမည်။
- Camera speaker မဖွင့်ရသေးခြင်း သို့မဟုတ် browser က audio playback ပိတ်ထားခြင်းဖြစ်လျှင် viewer ၏ talk/alarm ကို အောင်မြင်သည်ဟု မပြရ။ Camera ဘက်တွင် **Enable Speaker** လုပ်ရန် ပြရမည်။

### F09 — Media မသိမ်းခြင်းနှင့် access control

- Application သည် video/audio recording၊ snapshot၊ playback history ကို မဖန်တီးရ။ App database၊ file storage၊ analytics/log ထဲတွင် media payload မရေးရ။
- Signaling နှင့် TURN relay သည် live connection အတွက်သာ အသုံးပြုရမည်။ Pairing secrets နှင့် viewer credential များကို application log ထဲမရေးရ။
- မှန်ကန်သော QR + PIN pairing မရှိသော browser မှ stream ကို မကြည့်နိုင်ရ။
- Viewer → camera အသံကိုလည်း record သို့မဟုတ် သိမ်းဆည်းခြင်း မရှိရ။ Alarm သည် camera device တွင် ချက်ချင်းမြည်သော သတ်မှတ်ထားသည့်အသံသာ ဖြစ်ရမည်။

### F10 — Responsive browser support

- Camera UI ကို laptop screen နှင့် phone screen နှစ်မျိုးလုံးတွင် အသုံးပြုနိုင်ရမည်။ Viewer UI ကို phone portrait screen တွင် အသုံးပြုနိုင်ရမည်။
- MVP release test တွင် laptop Chrome/Edge၊ Android Chrome၊ iPhone Safari ကို အနည်းဆုံး စမ်းရမည်။ Browser/device တစ်ခုတွင် camera capture မရလျှင် unsupported/error state ကို တိတိကျကျပြရမည်။

### F11 — Viewer မှ camera ဆီ အသံပြောခြင်း

- Viewer နှင့် camera **Live** ချိတ်ထားပြီး camera ဘက် **Speaker Ready** ဖြစ်မှ **Hold to Talk** ကို သုံးနိုင်ရမည်။ Microphone permission မရှိသေးပါက Talk စသုံးချိန်တွင် တောင်းရမည်။ ခွင့်ပြုပြီးနောက် ခလုတ်ကို နှိပ်ထားစဉ်မှသာ အသံကို camera speaker မှ ကြားနိုင်ရမည်။
- ခလုတ်လွှတ်ခြင်း၊ viewer connection ပြတ်ခြင်း၊ **Stop Viewing** နှိပ်ခြင်း၊ သို့မဟုတ် camera session ရပ်ခြင်းတွင် viewer microphone capture နှင့် အသံပို့မှု ရပ်ရမည်။ Viewer တွင် **Talking** status၊ camera တွင် **Viewer talking** status ပြရမည်။
- Microphone permission ပယ်ချလျှင် အသံမပို့ဘဲ အကြောင်းပြချက်နှင့် ပြန်စမ်းရန်လုပ်ဆောင်ချက် ပြရမည်။ Viewer အသံကို app က မသိမ်းရ။

### F12 — Viewer မှ camera တွင် alarm မြည်စေခြင်း

- Viewer နှင့် camera **Live** ချိတ်ထားပြီး camera ဘက် **Speaker Ready** ဖြစ်မှ **Sound Alarm** ကို သုံးနိုင်ရမည်။ နှိပ်လျှင် camera device speaker မှ သတ်မှတ်ထားသော alarm အသံ ၅ စက္ကန့် မြည်ရမည်။
- Camera browser မှ အသံစတင်မြည်ကြောင်း အတည်ပြုပြီးမှ viewer တွင် **Alarm playing** ပြရမည်။ Playback ပိတ်ခံရခြင်း၊ connection ပြတ်ခြင်း သို့မဟုတ် speaker မဖွင့်ရသေးခြင်းတွင် **Alarm failed** ပြရမည်။
- Alarm မြည်နေစဉ် ထပ်နှိပ်ခြင်းဖြင့် alarm များ မထပ်တင်ရ။ Viewer သို့မဟုတ် camera မှ ရပ်နိုင်ရမည်။ Alarm အတွက် viewer microphone permission မတောင်းရ။

## MVP အပြီးသတ်စမ်းသပ်မှု

အထက်ပါ F01–F12 acceptance criteria များကို လက်တွေ့ device များပေါ်တွင် စစ်ပြီး camera Wi-Fi၊ viewer cellular data ဖြင့် live ကြည့်နိုင်ခြင်း၊ viewer အသံ/alarm ကို camera မှ ကြားနိုင်ခြင်းနှင့် viewer ထွက်ပြီးပြန်ဝင်နိုင်ခြင်း အောင်မြင်မှ MVP ပြီးစီးသည်ဟု သတ်မှတ်မည်။ Phone camera ကို စမ်းသပ်စဉ် screen ဖွင့်ထားပြီး RW tab ကို foreground တွင်ထားမည်။ Camera device ၏ speaker volume ကို ကြားနိုင်သောအဆင့်ထားပြီး silent mode ကိုပိတ်ထားရမည်။

Implementation ရွေးချယ်ချက်များကို [decessions.md](decessions.md) တွင်၊ MVP ပြင်ပ feature များကို [out-of-scope.md](out-of-scope.md) တွင် မှတ်တမ်းတင်ထားသည်။
