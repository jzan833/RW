# RW MVP — Decisions

ဤဖိုင်တွင် ၂ ရက် MVP အတွက် လက်ရှိသဘောတူထားသော product နှင့် technical ဆုံးဖြတ်ချက်များကို မှတ်တမ်းတင်ထားသည်။ Filename ကို တောင်းဆိုထားသည့် `decessions.md` အတိုင်းထားသည်။

| ID | ဆုံးဖြတ်ချက် | အကြောင်းရင်း / သက်ရောက်မှု |
| --- | --- | --- |
| D01 | Camera အဖြစ် laptop သို့မဟုတ် phone browser ကိုသုံးမည်။ Viewer သည် phone browser ဖြစ်မည်။ | Install လုပ်ရသော native app မလိုဘဲ MVP စမ်းနိုင်သည်။ |
| D02 | Media ပို့ရန် WebRTC၊ peer ချိတ်ရန် signaling၊ မတူသော network များတွင် လိုအပ်ပါက TURN relay သုံးမည်။ | Direct connection မရသော network များအတွက် relay လမ်းကြောင်းရှိစေသည်။ TURN အသုံးပြုမှုတွင် bandwidth ကုန်ကျနိုင်သည်။ |
| D03 | Site ကို HTTPS ဖြင့်ပေးမည်။ | Browser camera/microphone permission ရရန် လိုအပ်သည်။ |
| D04 | Account မရှိ။ Session တစ်ခုစီတွင် camera ၁ လုံးနှင့် active viewer ၁ လုံးသာရှိမည်။ | Pairing နှင့် session lifecycle ကို ရိုးရှင်းစေသည်။ |
| D05 | QR တွင် ခန့်မှန်းရန်ခက်သော session link ပါမည်။ ၆ လုံး PIN ကို camera screen တွင် သီးခြားပြမည်။ | QR တစ်ခုတည်း ပေါက်ကြားသွားလျှင် stream မကြည့်နိုင်စေရန်။ |
| D06 | Pair မလုပ်ရသေးသော invite သက်တမ်း ၅ မိနစ်၊ PIN မှား ၅ ကြိမ်လျှင် invite ပိတ်မည်။ Pair အောင်မြင်ပြီးလျှင် invite ကို ထပ်မသုံးနိုင်။ | Pairing ကို အကန့်အသတ်ထားပြီး PIN ခန့်မှန်းစမ်းသပ်မှုကို ကန့်သတ်သည်။ |
| D07 | Pair အောင်မြင်သော viewer browser တွင် session သက်တမ်းအတွက် credential ကို local browser storage တွင်ထားမည်။ Camera ရပ်လျှင် server က credential ကို ပယ်ဖျက်မည်။ | Account မရှိဘဲ viewer က app ကို background ပို့၊ tab/browser ပိတ် သို့မဟုတ် refresh လုပ်ပြီး တူညီသော browser မှ ပြန်ဝင်နိုင်စေရန်။ Session link ကိုသာ မျှဝေခြင်းဖြင့် အခြား device မဝင်နိုင်။ |
| D08 | Camera screen တွင် **Monitoring Active** သည် camera capture အလုပ်လုပ်ပြီး service နှင့်ချိတ်ထားသည်ဟု ဆိုလိုသည်။ Viewer ရှိ/မရှိကို သီးခြားပြမည်။ | User က မည်သည့်အချိန်တွင် capture လုပ်နေသည်ကို သိနိုင်သည်။ Capture/connection ပျက်လျှင် active ဟု မပြတော့။ |
| D09 | Camera → viewer live audio ၏ mic default **Off** ဖြစ်မည်။ Viewer → camera audio ကို **Hold to Talk** ဖြင့်သာ ပို့မည်။ | အခန်းအသံနှင့် viewer အသံကို user က ရည်ရွယ်ချက်ရှိရှိ ဖွင့်မှသာ ပို့သည်။ |
| D10 | Video/audio ကို app က မသိမ်း။ Session နှင့် pairing data ကို အသက်ရှင်နေသည့်အချိန်အတွက်သာ ထားမည်။ | Recording/history မပါသော scope နှင့် privacy လိုအပ်ချက်ကို ဖြည့်သည်။ TURN က media ကို live relay လုပ်နိုင်သော်လည်း app က persistent media storage မလုပ်။ |
| D11 | Phone camera သုံးစဉ် RW tab ကို foreground တွင်၊ screen ကိုဖွင့်ထားရန် MVP usage rule အဖြစ် သတ်မှတ်မည်။ | Phone lock/background တွင် browser capture ဆက်လက်လုပ်မည်ဟု အာမမခံနိုင်။ |
| D12 | Camera tab ပိတ်ခြင်း သို့မဟုတ် server restart ဖြစ်လျှင် session အသစ်စပြီး pair အသစ်လုပ်ရမည်။ | ၂ ရက် MVP တွင် durable session recovery မတည်ဆောက်ရသေး။ |
| D13 | Camera device တွင် **Enable Speaker** ကို monitoring စချိန်က user က နှိပ်ရမည်။ Speaker မဖွင့်နိုင်လျှင် viewer talk/alarm ကို အောင်မြင်သည်ဟု မပြ။ | Browser ၏ audio autoplay ကန့်သတ်ချက်ကြောင့် camera တွင် အသံထွက်မှုကို စတင်ချိန်ကတည်းက အတည်ပြုရန်။ |
| D14 | Viewer alarm သည် camera device တွင် ၅ စက္ကန့်မြည်သော သတ်မှတ်ထားသည့်အသံဖြစ်မည်။ Browser မှ playback စတင်ကြောင်း အတည်ပြုချက်ကို viewer သို့ပြန်ပို့မည်။ | Alarm ကို recording သို့မဟုတ် external notification မလိုဘဲ ချက်ချင်းသုံးနိုင်စေရန်။ |

## ၂ ရက် delivery အစီအစဉ်

- **Day 1:** HTTPS, camera preview, monitoring screen, QR + PIN, signaling, WebRTC, TURN နှင့် basic viewer screen။
- **Day 2:** Viewer limit/re-entry, audio toggle, Hold to Talk, alarm, status/error handling နှင့် laptop/Android/iPhone browser များကို Wi-Fi + cellular ဖြင့် စမ်းသပ်ခြင်း။

Feature အလိုက် လက်ခံမည့်အချက်များကို [requirements.md](requirements.md) တွင် သတ်မှတ်ထားသည်။
