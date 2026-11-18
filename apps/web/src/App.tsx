import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { IScannerControls } from "@zxing/browser";
import { io, type Socket } from "socket.io-client";

type Mode = "home" | "camera" | "viewer";
type AppPath = "/" | "/camera" | "/viewer";
type Locale = "en" | "my";
type Theme = "dark" | "light";
type CameraState = "idle" | "requesting" | "preview" | "error";
type PairingState = "idle" | "creating" | "ready" | "regenerating";
type ViewerPairingState = "idle" | "submitting" | "paired";

type CameraSession = {
  sessionId: string;
  cameraToken: string;
  expiresAt: string;
  invite: PairingInvite;
};

type PairingInvite = {
  inviteId: string;
  pin: string;
  expiresAt: string;
};

const messages = {
  en: {
    brandName: "Room Watch",
    brandTagline: "Private live room link",
    goHome: "Go to RW home",
    chooseRole: "Choose a device role",
    cameraMode: "Camera mode",
    viewerMode: "Viewer mode",
    themeLight: "Use light theme",
    themeDark: "Use dark theme",
    homeEyebrow: "Secure device link",
    homeTitle: "How would you like to use RW?",
    homeIntro: "Choose one role for this device. Open RW on a second device to use the other role.",
    useCamera: "Use as camera",
    useCameraHelp: "Place this laptop or phone in the room.",
    useViewer: "Use as viewer",
    useViewerHelp: "Watch a paired room from this device.",
    liveOnly: "Live only.",
    noSave: "RW does not save video or audio.",
    back: "Back to roles",
    cameraEyebrow: "Camera device",
    cameraTitle: "Set up this room camera",
    cameraIntro: "Preview the view on this device before you create a monitoring session.",
    idleStatus: "Camera is off",
    requestingStatus: "Waiting for camera permission",
    previewStatus: "Local preview on",
    errorStatus: "Camera needs attention",
    monitoringInterrupted: "Monitoring Interrupted",
    previewOnly: "Preview only — monitoring has not started",
    idleTitle: "Check the room view first",
    idleText: "Camera access starts only after you press Start camera. Microphone access is not requested.",
    startCamera: "Start camera",
    startingCamera: "Starting camera…",
    stopCamera: "Stop camera",
    tryAgain: "Try again",
    selectCamera: "Camera device",
    cameraFallback: "Camera",
    resolution: "Active resolution",
    autoResolution: "Automatic",
    localPreview: "Local camera preview",
    phoneNote: "On a phone, choose the front or back camera here. Keep the screen on and RW in the foreground.",
    noRecording: "This preview stays on this device and is not recorded.",
    createPairing: "Create pairing code",
    creatingPairing: "Creating secure code…",
    cameraPairingTitle: "Pair this viewer",
    pairedViewerTitle: "Viewer paired",
    pairedViewerConnected: "Viewer connected",
    pairedViewerWaiting: "The viewer is connecting or can reconnect without scanning again.",
    noViewers: "0 viewers",
    oneViewer: "1 viewer connected",
    roomAudio: "Room audio",
    cameraAudioTitle: "Audio controls",
    cameraAudioHelp: "One switch controls the room microphone. Enable this device's speaker to hear viewer talk and alarms.",
    viewerAudioHelp: "Listen to room audio, hold to talk back, or play an alarm.",
    audioPlaybackReady: "Audio playback ready",
    microphoneOff: "Room audio Off",
    microphoneOn: "Room audio On",
    enableMicrophone: "Turn room audio on",
    disableMicrophone: "Turn room audio off",
    microphoneStarting: "Enabling microphone…",
    microphoneError: "Microphone access failed. Allow microphone access, then try again.",
    speakerNotReady: "Speaker Not Ready",
    enableSpeaker: "Enable speaker",
    testSpeakerAgain: "Test speaker again",
    speakerChecking: "Testing speaker…",
    speakerReady: "Speaker Ready",
    speakerHelp: "Play a short test sound on this device before using talk or alarm.",
    speakerError: "Speaker playback was blocked. Check this device's sound settings and try again.",
    viewerTalking: "Viewer talking",
    viewerNotTalking: "Viewer is not talking",
    stopViewing: "Stop Viewing",
    holdToTalk: "Hold to Talk",
    requestingTalk: "Requesting microphone…",
    talking: "Talking — release to stop",
    speakerRequired: "Enable speaker on the camera to talk.",
    talkError: "Microphone access failed. Allow microphone access, then press and hold to try again.",
    tapToHearAudio: "Tap to hear room audio",
    soundAlarm: "Sound Alarm",
    sendingAlarm: "Sending alarm…",
    alarmPlaying: "Alarm playing",
    alarmStopping: "Stopping alarm…",
    alarmFinished: "Alarm finished",
    alarmFailed: "Alarm failed. Check that the camera speaker is ready and try again.",
    stopAlarm: "Stop alarm",
    pairingReady: "Pairing code ready",
    pairingHelp: "Scan the QR code on the viewer phone, then enter the separate six-digit PIN.",
    pairingPin: "Pairing PIN",
    expiresIn: "Expires in",
    inviteExpired: "Pairing code expired",
    inviteExpiredHelp: "This QR code and PIN can no longer be used. Generate a new code to pair.",
    regenerateInvite: "Regenerate code",
    regeneratingInvite: "Generating new code…",
    openPairingPage: "Open pairing page",
    generatingQr: "Generating QR code…",
    pairingError: "RW could not create a pairing code. Check the connection and try again.",
    sessionEnded: "The pairing session ended. Create a new pairing code.",
    errorDenied: "Camera access was blocked. Allow camera access for this site in browser settings, then try again.",
    errorNotFound: "No camera was found. Connect or enable a camera, then try again.",
    errorBusy: "The camera is busy or unavailable. Close other apps using it, then try again.",
    errorSecurity: "Camera access needs a secure HTTPS page. Reopen RW using its secure address.",
    errorUnsupported: "This browser cannot access a camera. Try a current version of Chrome, Edge, or Safari.",
    errorInterrupted: "The camera stopped unexpectedly. Check the device and try again.",
    errorGeneric: "RW could not start this camera. Check browser permission and the camera, then try again.",
    viewerEyebrow: "Viewer device",
    viewerTitle: "Watch a paired room",
    viewerIntro: "Use the QR code and PIN shown on the room camera when pairing becomes available.",
    waitingPair: "Waiting to pair",
    pairingTitle: "Pairing will happen here",
    pairingStep1: "Scan the QR code on the camera device.",
    pairingStep2: "Enter the six-digit PIN shown there.",
    pairingStep3: "View the room live after pairing.",
    enterPinTitle: "Enter the camera PIN",
    enterPinHelp: "Enter the separate six-digit PIN shown beside the QR code on the camera.",
    pinInputLabel: "Six-digit pairing PIN",
    pairViewer: "Pair viewer",
    pairingViewer: "Pairing securely…",
    viewerPaired: "Viewer paired",
    viewerPairedHelp: "This browser is authorized. Reconnect if the live picture stops.",
    monitoringEnded: "Monitoring ended",
    connectionTimeout: "Video did not start within 20 seconds. Check the connection, then retry.",
    relayUnavailable: "Cross-network relay is unavailable. Check the service's TURN settings, then retry.",
    retryConnection: "Retry connection",
    pairingUnavailableViewer: "Pairing failed. Check the QR link and PIN, then try again.",
    pairingLimitedViewer: "Too many attempts. Wait a few minutes, then try again.",
    invalidInviteViewer: "This pairing link is invalid. Scan a new QR code from the camera.",
    scanQr: "Scan camera QR code",
    stopScan: "Stop scanning",
    scanHelp: "Allow camera access, then point this device at the QR code shown on the camera screen.",
    pairingLinkLabel: "Pairing link",
    pairingLinkPlaceholder: "Paste the camera QR link",
    usePairingLink: "Use pairing link",
    scanUnavailable: "Could not scan. Allow camera access or paste the pairing link below."
  },
  my: {
    brandName: "Room Watch",
    brandTagline: "လုံခြုံသော live room link",
    goHome: "RW ပင်မစာမျက်နှာသို့ သွားရန်",
    chooseRole: "Device အမျိုးအစားရွေးပါ",
    cameraMode: "Camera mode",
    viewerMode: "Viewer mode",
    themeLight: "Light mode သုံးရန်",
    themeDark: "Dark mode သုံးရန်",
    homeEyebrow: "လုံခြုံသော device link",
    homeTitle: "RW ကို ဘယ်လိုအသုံးပြုမလဲ?",
    homeIntro: "ဒီ device အတွက် role တစ်ခုရွေးပါ။ အခြား role ကို ဒုတိယ device မှာ RW ဖွင့်ပြီးသုံးနိုင်ပါတယ်။",
    useCamera: "Camera အဖြစ်သုံးမယ်",
    useCameraHelp: "Laptop သို့မဟုတ် ဖုန်းကို အခန်းထဲထားပါ။",
    useViewer: "Viewer အဖြစ်သုံးမယ်",
    useViewerHelp: "Pair လုပ်ထားသောအခန်းကို ဒီ device မှကြည့်ပါ။",
    liveOnly: "Live သီးသန့်။",
    noSave: "RW က video နဲ့ audio ကို မသိမ်းပါ။",
    back: "Role ရွေးချယ်မှုသို့ ပြန်ရန်",
    cameraEyebrow: "Camera device",
    cameraTitle: "အခန်း Camera ကိုပြင်ဆင်ပါ",
    cameraIntro: "Monitoring session မစတင်မီ ဒီ device ပေါ်မှာ မြင်ကွင်းကို preview ကြည့်ပါ။",
    idleStatus: "Camera ပိတ်ထားသည်",
    requestingStatus: "Camera permission ကို စောင့်နေသည်",
    previewStatus: "Local preview ဖွင့်ထားသည်",
    errorStatus: "Camera ကို စစ်ဆေးရန်လိုသည်",
    monitoringInterrupted: "Monitoring ပြတ်တောက်နေသည်",
    previewOnly: "Preview သာဖြစ်သည် — monitoring မစတင်သေးပါ",
    idleTitle: "အခန်းမြင်ကွင်းကို အရင်စစ်ပါ",
    idleText: "Start camera နှိပ်မှသာ camera permission တောင်းပါမယ်။ Microphone permission မတောင်းပါ။",
    startCamera: "Camera စဖွင့်မယ်",
    startingCamera: "Camera ဖွင့်နေသည်…",
    stopCamera: "Camera ပိတ်မယ်",
    tryAgain: "ပြန်စမ်းမယ်",
    selectCamera: "Camera device",
    cameraFallback: "Camera",
    resolution: "လက်ရှိ resolution",
    autoResolution: "အလိုအလျောက်",
    localPreview: "Local camera preview",
    phoneNote: "ဖုန်းမှာ front သို့မဟုတ် back camera ကို ဒီနေရာကရွေးပါ။ Screen ဖွင့်ထားပြီး RW ကို foreground မှာထားပါ။",
    noRecording: "ဒီ preview က ဒီ device ပေါ်မှာပဲရှိပြီး record မလုပ်ပါ။",
    createPairing: "Pairing code ထုတ်မယ်",
    creatingPairing: "လုံခြုံသော code ထုတ်နေသည်…",
    cameraPairingTitle: "Viewer ကို Pair လုပ်ပါ",
    pairedViewerTitle: "Viewer Pair ချိတ်ပြီးပါပြီ",
    pairedViewerConnected: "Viewer ချိတ်ဆက်ထားသည်",
    pairedViewerWaiting: "Viewer ချိတ်ဆက်နေသည် သို့မဟုတ် QR ထပ် scan မလုပ်ဘဲ ပြန်ချိတ်နိုင်သည်။",
    noViewers: "Viewer မရှိသေးပါ",
    oneViewer: "Viewer ၁ ဦး ချိတ်ဆက်ထားသည်",
    roomAudio: "အခန်းအသံ",
    cameraAudioTitle: "အသံထိန်းချုပ်မှုများ",
    cameraAudioHelp: "ခလုတ်တစ်ခုတည်းက အခန်းအသံ Microphone ကို ထိန်းချုပ်ပါတယ်။ Viewer စကားနဲ့ Alarm ကြားဖို့ ဒီ device ရဲ့ Speaker ကို ဖွင့်ပါ။",
    viewerAudioHelp: "အခန်းအသံနားထောင်ပါ၊ ဖိထားပြီး ပြန်ပြောပါ သို့မဟုတ် Alarm မြည်စေပါ။",
    audioPlaybackReady: "အသံဖွင့်ရန် အဆင်သင့်ဖြစ်သည်",
    microphoneOff: "အခန်းအသံ ပိတ်ထားသည်",
    microphoneOn: "အခန်းအသံ ဖွင့်ထားသည်",
    enableMicrophone: "အခန်းအသံ ဖွင့်မယ်",
    disableMicrophone: "အခန်းအသံ ပိတ်မယ်",
    microphoneStarting: "Microphone ဖွင့်နေသည်…",
    microphoneError: "Microphone မဖွင့်နိုင်ပါ။ Permission ခွင့်ပြုပြီး ပြန်စမ်းပါ။",
    speakerNotReady: "Speaker အဆင်သင့်မဖြစ်သေးပါ",
    enableSpeaker: "Speaker ဖွင့်မယ်",
    testSpeakerAgain: "Speaker ပြန်စမ်းမယ်",
    speakerChecking: "Speaker စမ်းနေသည်…",
    speakerReady: "Speaker အဆင်သင့်ဖြစ်ပြီ",
    speakerHelp: "Talk သို့မဟုတ် alarm မသုံးမီ ဒီ device မှာ စမ်းသပ်အသံဖွင့်ပါ။",
    speakerError: "Speaker အသံမဖွင့်နိုင်ပါ။ Device အသံ setting ကိုစစ်ပြီး ပြန်စမ်းပါ။",
    viewerTalking: "Viewer က စကားပြောနေသည်",
    viewerNotTalking: "Viewer စကားမပြောသေးပါ",
    stopViewing: "ကြည့်ရှုမှုရပ်မယ်",
    holdToTalk: "ဖိထားပြီး စကားပြောမယ်",
    requestingTalk: "Microphone permission တောင်းနေသည်…",
    talking: "စကားပြောနေသည် — ရပ်ရန်လွှတ်ပါ",
    speakerRequired: "စကားပြောရန် Camera မှာ Speaker ဖွင့်ပါ။",
    talkError: "Microphone မဖွင့်နိုင်ပါ။ Permission ခွင့်ပြုပြီး ခလုတ်ကိုဖိထားကာ ပြန်စမ်းပါ။",
    tapToHearAudio: "အခန်းအသံကြားရန် နှိပ်ပါ",
    soundAlarm: "Alarm မြည်စေမယ်",
    sendingAlarm: "Alarm ပို့နေသည်…",
    alarmPlaying: "Alarm မြည်နေသည်",
    alarmStopping: "Alarm ရပ်နေသည်…",
    alarmFinished: "Alarm ပြီးသွားပြီ",
    alarmFailed: "Alarm မမြည်နိုင်ပါ။ Camera speaker ကိုစစ်ပြီး ပြန်စမ်းပါ။",
    stopAlarm: "Alarm ရပ်မယ်",
    pairingReady: "Pairing code အဆင်သင့်ဖြစ်ပြီ",
    pairingHelp: "Viewer ဖုန်းနဲ့ QR code ကို scan လုပ်ပြီး သီးခြား ဂဏန်းခြောက်လုံး PIN ကိုထည့်ပါ။",
    pairingPin: "Pairing PIN",
    expiresIn: "သက်တမ်းကျန်ချိန်",
    inviteExpired: "Pairing code သက်တမ်းကုန်သွားပြီ",
    inviteExpiredHelp: "ဒီ QR code နဲ့ PIN ကို ဆက်သုံးလို့မရတော့ပါ။ Pair လုပ်ရန် code အသစ်ထုတ်ပါ။",
    regenerateInvite: "Code အသစ်ထုတ်မယ်",
    regeneratingInvite: "Code အသစ်ထုတ်နေသည်…",
    openPairingPage: "Pairing စာမျက်နှာဖွင့်မယ်",
    generatingQr: "QR code ထုတ်နေသည်…",
    pairingError: "Pairing code မထုတ်နိုင်ပါ။ Internet connection ကိုစစ်ပြီး ပြန်စမ်းပါ။",
    sessionEnded: "Pairing session ပြီးဆုံးသွားပါပြီ။ Pairing code အသစ်ထုတ်ပါ။",
    errorDenied: "Camera access ကိုပိတ်ထားပါတယ်။ Browser settings မှာ ဒီ site အတွက် camera ကို Allow လုပ်ပြီး ပြန်စမ်းပါ။",
    errorNotFound: "Camera မတွေ့ပါ။ Camera ကိုချိတ်ဆက် သို့မဟုတ် ဖွင့်ပြီး ပြန်စမ်းပါ။",
    errorBusy: "Camera ကို အခြား app ကသုံးနေခြင်း သို့မဟုတ် အသုံးမပြုနိုင်ခြင်းဖြစ်နိုင်ပါတယ်။ အခြား app ကိုပိတ်ပြီး ပြန်စမ်းပါ။",
    errorSecurity: "Camera သုံးရန် HTTPS လုံခြုံသောစာမျက်နှာလိုပါတယ်။ RW secure address ကို ပြန်ဖွင့်ပါ။",
    errorUnsupported: "ဒီ browser က camera ကို မသုံးနိုင်ပါ။ နောက်ဆုံး Chrome, Edge သို့မဟုတ် Safari နဲ့စမ်းပါ။",
    errorInterrupted: "Camera ရုတ်တရက်ရပ်သွားပါတယ်။ Device ကိုစစ်ပြီး ပြန်စမ်းပါ။",
    errorGeneric: "ဒီ camera ကို RW မဖွင့်နိုင်ပါ။ Browser permission နဲ့ camera ကိုစစ်ပြီး ပြန်စမ်းပါ။",
    viewerEyebrow: "Viewer device",
    viewerTitle: "Pair လုပ်ထားသောအခန်းကိုကြည့်ပါ",
    viewerIntro: "Pairing ရသောအခါ room camera မှာပြထားတဲ့ QR code နဲ့ PIN ကိုသုံးပါ။",
    waitingPair: "Pair လုပ်ရန်စောင့်နေသည်",
    pairingTitle: "Pairing ကို ဒီနေရာမှာလုပ်ပါမယ်",
    pairingStep1: "Camera device ပေါ်က QR code ကို scan လုပ်ပါ။",
    pairingStep2: "အဲဒီမှာပြထားတဲ့ ဂဏန်းခြောက်လုံး PIN ကိုထည့်ပါ။",
    pairingStep3: "Pair ပြီးလျှင် အခန်းကို live ကြည့်ပါ။",
    enterPinTitle: "Camera PIN ကိုထည့်ပါ",
    enterPinHelp: "Camera ပေါ် QR code ဘေးမှာပြထားတဲ့ သီးခြား ဂဏန်းခြောက်လုံး PIN ကိုထည့်ပါ။",
    pinInputLabel: "ဂဏန်းခြောက်လုံး Pairing PIN",
    pairViewer: "Viewer ကို Pair လုပ်မယ်",
    pairingViewer: "လုံခြုံစွာ Pair လုပ်နေသည်…",
    viewerPaired: "Viewer Pair လုပ်ပြီးပြီ",
    viewerPairedHelp: "ဒီ browser ကိုခွင့်ပြုပြီးပါပြီ။ Live ပုံရိပ်ရပ်သွားလျှင် ပြန်ချိတ်ဆက်နိုင်ပါတယ်။",
    monitoringEnded: "Monitoring ရပ်တန့်သွားသည်",
    connectionTimeout: "စက္ကန့် ၂၀ အတွင်း Video မစတင်နိုင်ပါ။ အင်တာနက်ကိုစစ်ပြီး ပြန်ချိတ်ပါ။",
    relayUnavailable: "Network မတူသော device များအတွက် relay မရနိုင်ပါ။ Service ၏ TURN setting ကို စစ်ပြီး ပြန်ချိတ်ပါ။",
    retryConnection: "ပြန်ချိတ်ဆက်ရန်",
    pairingUnavailableViewer: "Pairing မအောင်မြင်ပါ။ QR link နဲ့ PIN ကိုစစ်ပြီး ပြန်စမ်းပါ။",
    pairingLimitedViewer: "အကြိမ်များလွန်းပါတယ်။ မိနစ်အနည်းငယ်စောင့်ပြီး ပြန်စမ်းပါ။",
    invalidInviteViewer: "ဒီ pairing link မမှန်ပါ။ Camera မှ QR code အသစ်ကို scan လုပ်ပါ။",
    scanQr: "Camera QR code scan မယ်",
    stopScan: "Scan ရပ်မယ်",
    scanHelp: "Camera access ခွင့်ပြုပြီး ဒီ device ကို camera ပေါ် QR code ဆီ ဦးတည်ပါ။",
    pairingLinkLabel: "Pairing link",
    pairingLinkPlaceholder: "Camera QR link ကို paste လုပ်ပါ",
    usePairingLink: "Pairing link သုံးမယ်",
    scanUnavailable: "Scan မလုပ်နိုင်ပါ။ Camera access ခွင့်ပြုပါ သို့မဟုတ် pairing link ကို အောက်မှာ paste လုပ်ပါ။"
  }
} as const;

const pathToMode = (path: string): Mode => {
  if (path === "/camera") return "camera";
  if (path === "/viewer") return "viewer";
  return "home";
};

const initialLocale = (): Locale => localStorage.getItem("rw-locale") === "my" ? "my" : "en";

const initialTheme = (): Theme => {
  const stored = localStorage.getItem("rw-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const opaqueValuePattern = /^[A-Za-z0-9_-]{43}$/;

const isPairingInvite = (value: unknown): value is PairingInvite => {
  if (!value || typeof value !== "object") return false;
  const invite = value as Record<string, unknown>;
  return (
    typeof invite.inviteId === "string" &&
    opaqueValuePattern.test(invite.inviteId) &&
    typeof invite.pin === "string" &&
    /^\d{6}$/.test(invite.pin) &&
    typeof invite.expiresAt === "string" &&
    Number.isFinite(Date.parse(invite.expiresAt))
  );
};

const isCameraSession = (value: unknown): value is CameraSession => {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.sessionId === "string" &&
    opaqueValuePattern.test(session.sessionId) &&
    typeof session.cameraToken === "string" &&
    opaqueValuePattern.test(session.cameraToken) &&
    typeof session.expiresAt === "string" &&
    Number.isFinite(Date.parse(session.expiresAt)) &&
    isPairingInvite(session.invite)
  );
};

const pairingUrlFor = (inviteId: string) => {
  const url = new URL("/viewer", window.location.origin);
  url.searchParams.set("invite", inviteId);
  return url.toString();
};

function inviteIdFromPairingText(value: string): string | undefined {
  try {
    const link = new URL(value.trim());
    if (link.origin !== window.location.origin || link.pathname !== "/viewer") return undefined;
    const inviteId = link.searchParams.get("invite") ?? "";
    return opaqueValuePattern.test(inviteId) ? inviteId : undefined;
  } catch {
    return undefined;
  }
}

type IceServerResponse = { iceServers?: RTCIceServer[] };

async function loadIceServers(sessionId: string, cameraToken?: string): Promise<RTCIceServer[]> {
  const response = await fetch(`/api/turn-credentials/${encodeURIComponent(sessionId)}`, {
    headers: cameraToken ? { Authorization: `Bearer ${cameraToken}` } : undefined,
    credentials: "include"
  });
  if (!response.ok) return [];
  const payload = await response.json() as IceServerResponse;
  return Array.isArray(payload.iceServers) ? payload.iceServers : [];
}

async function getViewerConnectionInfo(): Promise<{ sessionId: string; iceServers: RTCIceServer[] } | undefined> {
  const response = await fetch("/api/viewer-session/connection", { credentials: "include" });
  if (response.status === 401) throw new Error("Viewer session ended");
  if (!response.ok) return undefined;
  const payload = await response.json() as { sessionId?: unknown; iceServers?: unknown };
  if (typeof payload.sessionId !== "string" || !opaqueValuePattern.test(payload.sessionId)) return undefined;
  return {
    sessionId: payload.sessionId,
    iceServers: Array.isArray(payload.iceServers) ? payload.iceServers as RTCIceServer[] : []
  };
}

function fitVideoFrameWidth(containerWidth: number, videoWidth: number, videoHeight: number, viewportHeight: number, reservedHeight: number) {
  if (containerWidth <= 0 || videoWidth <= 0 || videoHeight <= 0 || viewportHeight <= reservedHeight) return undefined;
  const maxHeight = Math.min(viewportHeight * 0.86, viewportHeight - reservedHeight, 1_100);
  return Math.floor(Math.min(containerWidth, maxHeight * videoWidth / videoHeight));
}

function startAudioTone(context: AudioContext, frequency: number, durationSeconds: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.12;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + durationSeconds);
  return oscillator;
}

function playSpeakerTestTone(context: AudioContext) {
  return new Promise<void>((resolve, reject) => {
    let oscillator: OscillatorNode;
    try {
      oscillator = startAudioTone(context, 880, 0.22);
    } catch (error) {
      reject(error);
      return;
    }
    const timeout = window.setTimeout(() => {
      try { oscillator.stop(); } catch { /* The test tone may already have ended. */ }
      reject(new Error("Speaker test did not finish"));
    }, 1_500);
    oscillator.onended = () => {
      window.clearTimeout(timeout);
      if (context.state === "running") resolve();
      else reject(new Error("Audio playback stopped"));
    };
  });
}

function startAlarmTone(context: AudioContext, durationSeconds: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  for (let step = 0; step < Math.ceil(durationSeconds / 0.45); step += 1) {
    oscillator.frequency.setValueAtTime(step % 2 === 0 ? 660 : 990, context.currentTime + step * 0.45);
  }
  gain.gain.value = 0.14;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + durationSeconds);
  return oscillator;
}

const formatCountdown = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const createAlarmRequestId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const revokeCameraSession = (session: CameraSession, keepalive = false) => {
  try {
    void fetch(`/api/monitoring-sessions/${encodeURIComponent(session.sessionId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.cameraToken}` },
      keepalive
    }).catch(() => undefined);
  } catch {
    // The in-memory session expires server-side even if a page-exit request cannot be sent.
  }
};

export default function App() {
  const [mode, setMode] = useState<Mode>(() => pathToMode(window.location.pathname));
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const handlePopState = () => setMode(pathToMode(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale === "my" ? "my" : "en";
    localStorage.setItem("rw-theme", theme);
    localStorage.setItem("rw-locale", locale);
  }, [locale, theme]);

  const navigate = (path: AppPath) => {
    window.history.pushState({}, "", path);
    setMode(pathToMode(path));
  };

  const settings = { locale, setLocale, theme, setTheme };

  if (mode === "camera") return <CameraScreen onHome={() => navigate("/")} {...settings} />;
  if (mode === "viewer") return <ViewerScreen onHome={() => navigate("/")} {...settings} />;
  return <HomeScreen onNavigate={navigate} {...settings} />;
}

type HeaderProps = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onHome?: () => void;
  mode?: "camera" | "viewer";
};

function AppHeader({ locale, setLocale, theme, setTheme, onHome, mode }: HeaderProps) {
  const copy = messages[locale];
  const modeLabel = mode === "camera" ? copy.cameraMode : mode === "viewer" ? copy.viewerMode : copy.chooseRole;

  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={onHome} aria-label={copy.goHome}>
        <span aria-hidden="true" className="brand-mark">RW</span>
        <span className="brand-copy">
          <strong>{copy.brandName}</strong>
          <small>{copy.brandTagline}</small>
        </span>
      </button>
      <div className="header-tools">
        <p className="mode-label">{modeLabel}</p>
        <div className="language-switch" aria-label="Language">
          <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
          <button type="button" aria-pressed={locale === "my"} onClick={() => setLocale("my")}>MYA</button>
        </div>
        <button
          className="theme-switch"
          type="button"
          aria-label={theme === "dark" ? copy.themeLight : copy.themeDark}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
        </button>
      </div>
    </header>
  );
}

type ScreenSettings = Omit<HeaderProps, "mode" | "onHome">;

function HomeScreen({ onNavigate, ...settings }: { onNavigate: (path: AppPath) => void } & ScreenSettings) {
  const copy = messages[settings.locale];
  return (
    <main className="page-shell">
      <div className="tech-grid" aria-hidden="true" />
      <div className="app-surface">
        <AppHeader {...settings} />
        <section className="home-hero" aria-labelledby="home-title">
          <p className="eyebrow"><span aria-hidden="true">●</span> {copy.homeEyebrow}</p>
          <h1 id="home-title">{copy.homeTitle}</h1>
          <p className="intro">{copy.homeIntro}</p>
          <div className="mode-grid">
            <button className="mode-button camera-choice" type="button" onClick={() => onNavigate("/camera")}>
              <DeviceIcon kind="camera" />
              <span className="mode-copy"><strong>{copy.useCamera}</strong><small>{copy.useCameraHelp}</small></span>
              <span className="button-arrow" aria-hidden="true">→</span>
            </button>
            <button className="mode-button viewer-choice" type="button" onClick={() => onNavigate("/viewer")}>
              <DeviceIcon kind="viewer" />
              <span className="mode-copy"><strong>{copy.useViewer}</strong><small>{copy.useViewerHelp}</small></span>
              <span className="button-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </section>
        <aside className="privacy-note" aria-label="Privacy note">
          <span className="privacy-dot" aria-hidden="true" />
          <p><strong>{copy.liveOnly}</strong> {copy.noSave}</p>
        </aside>
      </div>
    </main>
  );
}

function CameraScreen({ onHome, ...settings }: { onHome: () => void } & ScreenSettings) {
  const copy = messages[settings.locale];
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resolution, setResolution] = useState("");
  const [cameraDimensions, setCameraDimensions] = useState({ width: 16, height: 9 });
  const [cameraFrameWidth, setCameraFrameWidth] = useState<number>();
  const [cameraSession, setCameraSession] = useState<CameraSession>();
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [microphoneRequesting, setMicrophoneRequesting] = useState(false);
  const [microphoneError, setMicrophoneError] = useState("");
  const [speakerState, setSpeakerState] = useState<"off" | "checking" | "ready" | "error">("off");
  const [speakerError, setSpeakerError] = useState("");
  const [alarmPlaying, setAlarmPlaying] = useState(false);
  const [pairingState, setPairingState] = useState<PairingState>("idle");
  const [pairingError, setPairingError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [clock, setClock] = useState(Date.now);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const microphoneOperationRef = useRef(0);
  const cameraAudioSenderRef = useRef<RTCRtpSender | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const speakerReadyRef = useRef(false);
  const speakerOperationRef = useRef(0);
  const alarmRequestIdRef = useRef<string | null>(null);
  const alarmOscillatorRef = useRef<OscillatorNode | null>(null);
  const sessionRef = useRef<CameraSession | undefined>(undefined);
  const operationRef = useRef(0);
  const pairingOperationRef = useRef(0);
  const mountedRef = useRef(true);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingCameraCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const cameraRemoteDescriptionReadyRef = useRef(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [hasPairedViewer, setHasPairedViewer] = useState(false);
  const [captureInterrupted, setCaptureInterrupted] = useState(false);
  const [viewerTalking, setViewerTalking] = useState(false);
  const [signalConnected, setSignalConnected] = useState(false);

  const stopTracks = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const stopMicrophone = () => {
    microphoneOperationRef.current += 1;
    const stream = microphoneStreamRef.current;
    microphoneStreamRef.current = null;
    void cameraAudioSenderRef.current?.replaceTrack(null).catch(() => undefined);
    stopTracks(stream);
    setMicrophoneOn(false);
    setMicrophoneRequesting(false);
  };

  const finishAlarm = (requestId: string, status: "failed" | "ended", stopTone = true) => {
    if (alarmRequestIdRef.current !== requestId) return;
    alarmRequestIdRef.current = null;
    const oscillator = alarmOscillatorRef.current;
    alarmOscillatorRef.current = null;
    if (stopTone && oscillator) {
      try { oscillator.stop(); } catch { /* The oscillator may already have ended. */ }
    }
    setAlarmPlaying(false);
    socketRef.current?.emit("rw:alarm-result", { requestId, status });
  };

  const stopAlarm = () => {
    const requestId = alarmRequestIdRef.current;
    if (requestId) finishAlarm(requestId, "ended");
  };

  const connectRemoteAudio = () => {
    const context = audioContextRef.current;
    const stream = remoteAudioStreamRef.current;
    if (!context || context.state !== "running" || !stream) return;
    remoteAudioSourceRef.current?.disconnect();
    const source = context.createMediaStreamSource(stream);
    source.connect(context.destination);
    remoteAudioSourceRef.current = source;
  };

  const resetSpeaker = () => {
    speakerOperationRef.current += 1;
    stopAlarm();
    speakerReadyRef.current = false;
    setSpeakerState("off");
    setSpeakerError("");
    remoteAudioSourceRef.current?.disconnect();
    remoteAudioSourceRef.current = null;
    remoteAudioStreamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  };

  const enableSpeaker = async () => {
    if (alarmRequestIdRef.current) return;
    const operation = speakerOperationRef.current + 1;
    speakerOperationRef.current = operation;
    stopAlarm();
    setSpeakerState("checking");
    setSpeakerError("");
    speakerReadyRef.current = false;
    socketRef.current?.emit("rw:speaker-status", { ready: false });
    try {
      const Context = window.AudioContext;
      if (typeof Context !== "function") throw new Error("Web Audio is unavailable");
      const context = audioContextRef.current ?? new Context();
      audioContextRef.current = context;
      context.onstatechange = () => {
        if (audioContextRef.current !== context || context.state === "running" || !speakerReadyRef.current) return;
        speakerReadyRef.current = false;
        setSpeakerState("error");
        setSpeakerError(copy.speakerError);
        stopAlarm();
        socketRef.current?.emit("rw:speaker-status", { ready: false });
      };
      await context.resume();
      if (context.state !== "running") throw new Error("Audio playback is suspended");
      await playSpeakerTestTone(context);
      if (!mountedRef.current || speakerOperationRef.current !== operation) return;
      speakerReadyRef.current = true;
      setSpeakerState("ready");
      socketRef.current?.emit("rw:speaker-status", { ready: true });
      connectRemoteAudio();
    } catch {
      if (!mountedRef.current || speakerOperationRef.current !== operation) return;
      speakerReadyRef.current = false;
      setSpeakerState("error");
      setSpeakerError(copy.speakerError);
      socketRef.current?.emit("rw:speaker-status", { ready: false });
    }
  };

  const toggleMicrophone = async () => {
    if (microphoneRequesting) return;
    setMicrophoneError("");
    if (microphoneStreamRef.current) {
      stopMicrophone();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneError(copy.microphoneError);
      return;
    }

    const operation = microphoneOperationRef.current + 1;
    microphoneOperationRef.current = operation;
    setMicrophoneRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const track = stream.getAudioTracks()[0];
      if (!mountedRef.current || microphoneOperationRef.current !== operation || !cameraSession || !track) {
        stopTracks(stream);
        if (!track && mountedRef.current && microphoneOperationRef.current === operation) {
          setMicrophoneError(copy.microphoneError);
          setMicrophoneRequesting(false);
        }
        return;
      }
      track.addEventListener("ended", () => {
        if (microphoneStreamRef.current !== stream) return;
        microphoneStreamRef.current = null;
        void cameraAudioSenderRef.current?.replaceTrack(null).catch(() => undefined);
        setMicrophoneOn(false);
        setMicrophoneError(copy.microphoneError);
      }, { once: true });
      await cameraAudioSenderRef.current?.replaceTrack(track);
      if (!mountedRef.current || microphoneOperationRef.current !== operation) {
        stopTracks(stream);
        return;
      }
      microphoneStreamRef.current = stream;
      setMicrophoneOn(true);
      setMicrophoneRequesting(false);
    } catch {
      if (!mountedRef.current || microphoneOperationRef.current !== operation) return;
      setMicrophoneRequesting(false);
      setMicrophoneError(copy.microphoneError);
    }
  };

  const clearStream = () => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (cameraState !== "preview") {
      setCameraFrameWidth(undefined);
      return;
    }
    const frame = previewFrameRef.current;
    const panel = frame?.parentElement;
    if (!frame || !panel) return;
    const fitFrame = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const width = fitVideoFrameWidth(panel.clientWidth, cameraDimensions.width, cameraDimensions.height, viewportHeight, 180);
      if (width !== undefined) setCameraFrameWidth(width);
    };
    fitFrame();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(fitFrame);
    observer?.observe(panel);
    window.addEventListener("resize", fitFrame);
    window.visualViewport?.addEventListener("resize", fitFrame);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fitFrame);
      window.visualViewport?.removeEventListener("resize", fitFrame);
    };
  }, [cameraState, cameraDimensions.width, cameraDimensions.height]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      pairingOperationRef.current += 1;
      speakerOperationRef.current += 1;
      stopTracks(streamRef.current);
      streamRef.current = null;
      const activeSession = sessionRef.current;
      sessionRef.current = undefined;
      microphoneOperationRef.current += 1;
      stopTracks(microphoneStreamRef.current);
      microphoneStreamRef.current = null;
      remoteAudioSourceRef.current?.disconnect();
      stopAlarm();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => undefined);
      }
      audioContextRef.current = null;
      if (activeSession) revokeCameraSession(activeSession, true);
    };
  }, []);

  useEffect(() => {
    if (!cameraSession) return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [cameraSession?.invite.expiresAt]);

  useEffect(() => {
    if (!cameraSession) return;
    if (typeof RTCPeerConnection === "undefined") return;
    let cameraIceServersRequestedAt = 0;
    let cameraIceServersPromise: Promise<RTCIceServer[]> | undefined;
    const getCameraIceServers = () => {
      if (!cameraIceServersPromise || Date.now() - cameraIceServersRequestedAt >= 30 * 60_000) {
        cameraIceServersRequestedAt = Date.now();
        cameraIceServersPromise = loadIceServers(cameraSession.sessionId, cameraSession.cameraToken).catch((error: unknown) => {
          cameraIceServersPromise = undefined;
          throw error;
        });
      }
      return cameraIceServersPromise;
    };
    void getCameraIceServers().catch(() => undefined);
    const socket = io({ auth: { role: "camera", sessionId: cameraSession.sessionId, token: cameraSession.cameraToken }, transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setSignalConnected(true);
      socket.emit("rw:speaker-status", { ready: speakerReadyRef.current });
    });
    socket.on("disconnect", () => {
      setSignalConnected(false);
      setViewerTalking(false);
      stopAlarm();
    });
    const makePeer = async () => {
      peerRef.current?.close();
      let iceServers: RTCIceServer[];
      try { iceServers = await getCameraIceServers(); }
      catch { setPairingError("TURN connection unavailable. Check the connection and retry."); return; }
      if (!socket.connected || !streamRef.current?.getVideoTracks()[0] || streamRef.current.getVideoTracks()[0].readyState !== "live") return;
      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;
      pendingCameraCandidatesRef.current = [];
      cameraRemoteDescriptionReadyRef.current = false;
      streamRef.current?.getTracks().forEach((track) => peer.addTrack(track, streamRef.current!));
      const audioTransceiver = peer.addTransceiver("audio", { direction: "sendrecv" });
      cameraAudioSenderRef.current = audioTransceiver.sender;
      const microphoneTrack = microphoneStreamRef.current?.getAudioTracks()[0];
      if (microphoneTrack) await audioTransceiver.sender.replaceTrack(microphoneTrack);
      peer.ontrack = (event) => {
        if (event.track.kind !== "audio") return;
        remoteAudioStreamRef.current = event.streams[0] ?? new MediaStream([event.track]);
        if (speakerReadyRef.current) connectRemoteAudio();
      };
      peer.onicecandidate = (event) => { if (event.candidate) socket.emit("rw:signal", { type: "ice", payload: event.candidate }); };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("rw:signal", { type: "offer", payload: offer });
    };
    socket.on("rw:peer-joined", (event: { role: string }) => { if (event.role === "viewer") void makePeer().catch(() => setPairingError("Live connection failed. Retry pairing.")); });
    socket.on("rw:peer-left", (event: { role: string }) => { if (event.role === "viewer") { peerRef.current?.close(); peerRef.current = null; cameraAudioSenderRef.current = null; remoteAudioSourceRef.current?.disconnect(); remoteAudioSourceRef.current = null; remoteAudioStreamRef.current = null; setViewerTalking(false); stopAlarm(); } });
    socket.on("rw:signal", async (message: { type: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit }) => {
      const peer = peerRef.current;
      if (!peer) return;
      try {
        if (message.type === "offer") {
          cameraRemoteDescriptionReadyRef.current = false;
          await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
          cameraRemoteDescriptionReadyRef.current = true;
          for (const candidate of pendingCameraCandidatesRef.current.splice(0)) await peer.addIceCandidate(candidate);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("rw:signal", { type: "answer", payload: answer });
        }
        if (message.type === "answer") {
          cameraRemoteDescriptionReadyRef.current = false;
          await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
          cameraRemoteDescriptionReadyRef.current = true;
          for (const candidate of pendingCameraCandidatesRef.current.splice(0)) await peer.addIceCandidate(candidate);
        }
        if (message.type === "ice") {
          if (!cameraRemoteDescriptionReadyRef.current || !peer.remoteDescription) {
            pendingCameraCandidatesRef.current.push(message.payload as RTCIceCandidateInit);
          } else await peer.addIceCandidate(message.payload as RTCIceCandidateInit);
        }
      } catch { setPairingError("Live connection failed. Retry pairing."); }
    });
    socket.on("rw:viewer-count", (event: { count: number }) => {
      const count = event?.count === 1 ? 1 : 0;
      setViewerCount(count);
      if (count === 1) setHasPairedViewer(true);
    });
    socket.on("rw:viewer-paired", () => setHasPairedViewer(true));
    socket.on("rw:viewer-talking", (event: { talking: boolean }) => setViewerTalking(event.talking));
    socket.on("rw:alarm", (event: { requestId: string }) => {
      const requestId = event?.requestId;
      const context = audioContextRef.current;
      if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(requestId)) return;
      if (!speakerReadyRef.current || !context || context.state !== "running" || alarmRequestIdRef.current) {
        socket.emit("rw:alarm-result", { requestId, status: "failed" });
        return;
      }
      try {
        const oscillator = startAlarmTone(context, 5);
        alarmRequestIdRef.current = requestId;
        alarmOscillatorRef.current = oscillator;
        setAlarmPlaying(true);
        oscillator.onended = () => finishAlarm(requestId, "ended", false);
        socket.emit("rw:alarm-result", { requestId, status: "started" });
      } catch {
        socket.emit("rw:alarm-result", { requestId, status: "failed" });
      }
    });
    socket.on("rw:alarm-stop", (event: { requestId: string }) => {
      if (event?.requestId === alarmRequestIdRef.current) finishAlarm(event.requestId, "ended");
    });
    return () => { peerRef.current?.close(); peerRef.current = null; cameraAudioSenderRef.current = null; socket.disconnect(); socketRef.current = null; setSignalConnected(false); setViewerCount(0); };
  }, [cameraSession?.sessionId]);

  useEffect(() => {
    if (!cameraSession) {
      setQrCode("");
      return;
    }

    let cancelled = false;
    const pairUrl = pairingUrlFor(cameraSession.invite.inviteId);
    void QRCode.toString(pairUrl, {
      type: "svg",
      margin: 1,
      width: 320,
      color: { dark: "#06111f", light: "#ffffff" }
    }).then((svg) => {
      if (!cancelled) setQrCode(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    }).catch(() => {
      if (!cancelled) setQrCode("");
    });

    return () => {
      cancelled = true;
    };
  }, [cameraSession?.invite.inviteId]);

  const errorFor = (error: unknown) => {
    if (!(error instanceof DOMException)) return copy.errorGeneric;
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") return copy.errorDenied;
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") return copy.errorNotFound;
    if (error.name === "NotReadableError" || error.name === "TrackStartError" || error.name === "AbortError") return copy.errorBusy;
    if (error.name === "SecurityError") return copy.errorSecurity;
    return copy.errorGeneric;
  };

  const clearPairingSession = (revoke = true) => {
    pairingOperationRef.current += 1;
    stopMicrophone();
    setMicrophoneError("");
    resetSpeaker();
    const activeSession = sessionRef.current;
    sessionRef.current = undefined;
    setCameraSession(undefined);
    setHasPairedViewer(false);
    setViewerCount(0);
    setPairingState("idle");
    setPairingError("");
    setQrCode("");
    if (revoke && activeSession) revokeCameraSession(activeSession);
  };

  const createPairingSession = async () => {
    const operation = pairingOperationRef.current + 1;
    pairingOperationRef.current = operation;
    setPairingState("creating");
    setPairingError("");
    setHasPairedViewer(false);

    try {
      const response = await fetch("/api/monitoring-sessions", {
        method: "POST",
        headers: { Accept: "application/json" }
      });
      const payload: unknown = response.ok ? await response.json() : undefined;
      if (!response.ok || !isCameraSession(payload)) throw new Error("invalid session response");
      if (!mountedRef.current || pairingOperationRef.current !== operation) {
        revokeCameraSession(payload);
        return;
      }

      sessionRef.current = payload;
      setCameraSession(payload);
      setClock(Date.now());
      setPairingState("ready");
    } catch {
      if (!mountedRef.current || pairingOperationRef.current !== operation) return;
      setPairingState("idle");
      setPairingError(copy.pairingError);
    }
  };

  const regenerateInvite = async () => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    const operation = pairingOperationRef.current + 1;
    pairingOperationRef.current = operation;
    setPairingState("regenerating");
    setPairingError("");

    try {
      const response = await fetch(
        `/api/monitoring-sessions/${encodeURIComponent(activeSession.sessionId)}/invite`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${activeSession.cameraToken}`
          }
        }
      );
      const payload: unknown = response.ok ? await response.json() : undefined;
      const nextInvite = payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).invite
        : undefined;
      if (!response.ok || !isPairingInvite(nextInvite)) {
        if (response.status === 404) {
          clearPairingSession(false);
          setPairingError(copy.sessionEnded);
          return;
        }
        throw new Error("invalid invite response");
      }
      if (!mountedRef.current || pairingOperationRef.current !== operation) return;

      const nextSession = { ...activeSession, invite: nextInvite };
      sessionRef.current = nextSession;
      setCameraSession(nextSession);
      setClock(Date.now());
      setPairingState("ready");
    } catch {
      if (!mountedRef.current || pairingOperationRef.current !== operation) return;
      setPairingState("ready");
      setPairingError(copy.pairingError);
    }
  };

  const openCamera = async (deviceId?: string) => {
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setCameraState("requesting");
    setCaptureInterrupted(false);
    setErrorMessage("");
    clearStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(copy.errorUnsupported);
      setCameraState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : true
      });

      if (!mountedRef.current || operationRef.current !== operation) {
        stopTracks(stream);
        return;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const trackSettings = videoTrack?.getSettings?.() ?? {};
      streamRef.current = stream;
      videoTrack?.addEventListener("ended", () => {
        if (!mountedRef.current || streamRef.current !== stream) return;
        setCaptureInterrupted(true);
        operationRef.current += 1;
        clearPairingSession();
        clearStream();
        setResolution("");
        setErrorMessage(copy.errorInterrupted);
        setCameraState("error");
      }, { once: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }

      setSelectedDeviceId(trackSettings.deviceId ?? deviceId ?? "");
      if (trackSettings.width && trackSettings.height) {
        setCameraDimensions({ width: trackSettings.width, height: trackSettings.height });
      }
      setResolution(trackSettings.width && trackSettings.height ? `${trackSettings.width} × ${trackSettings.height}` : copy.autoResolution);
      setCameraState("preview");

      if (navigator.mediaDevices.enumerateDevices) {
        const availableDevices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
        if (mountedRef.current && operationRef.current === operation) {
          setDevices(availableDevices.filter((candidate) => candidate.kind === "videoinput"));
        }
      }
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) return;
      setResolution("");
      setErrorMessage(errorFor(error));
      setCameraState("error");
    }
  };

  const stopCamera = () => {
    operationRef.current += 1;
    clearPairingSession();
    clearStream();
    setCaptureInterrupted(false);
    setResolution("");
    setErrorMessage("");
    setCameraState("idle");
  };

  const statusText = captureInterrupted
    ? copy.monitoringInterrupted
    : cameraSession && cameraState === "preview"
    ? signalConnected ? "Monitoring Active" : "Monitoring Interrupted"
    : cameraState === "requesting"
    ? copy.requestingStatus
    : cameraState === "preview"
      ? copy.previewStatus
      : cameraState === "error"
        ? copy.errorStatus
        : copy.idleStatus;
  const inviteExpiresAt = cameraSession ? Date.parse(cameraSession.invite.expiresAt) : 0;
  const inviteExpired = Boolean(cameraSession && inviteExpiresAt <= clock);
  const inviteCountdown = formatCountdown(inviteExpiresAt - clock);
  const pairUrl = cameraSession ? pairingUrlFor(cameraSession.invite.inviteId) : "";

  return (
    <main className={`page-shell${cameraState === "preview" ? " camera-monitoring-shell" : ""}`}>
      <div className="tech-grid" aria-hidden="true" />
      <div className={`app-surface role-surface camera-surface${cameraState === "preview" ? " camera-monitoring-surface" : ""}`}>
        <AppHeader mode="camera" onHome={onHome} {...settings} />
        <section className={`camera-layout${cameraState === "preview" ? " camera-preview-layout" : ""}`} aria-labelledby="camera-title">
          <div className="role-intro camera-copy">
            <button className="text-button" type="button" onClick={onHome}>← {copy.back}</button>
            <p className="eyebrow"><span aria-hidden="true">●</span> {copy.cameraEyebrow}</p>
            <h1 id="camera-title">{copy.cameraTitle}</h1>
            <p className="intro">{copy.cameraIntro}</p>
            <div className="camera-readout" aria-live="polite">
              <div className={`status-row status-${cameraState}`}>
                <span className="status-dot" aria-hidden="true" />
                <p>{statusText}</p>
              </div>
              {!cameraSession ? <p className="preview-boundary">{copy.previewOnly}</p> : null}
              {cameraSession ? <p role="status">{viewerCount === 1 ? copy.oneViewer : copy.noViewers}</p> : null}
            </div>

            {cameraState === "preview" && devices.length > 0 ? (
              <label className="device-select">
                <span>{copy.selectCamera}</span>
                <select
                  value={selectedDeviceId}
                  onChange={(event) => {
                    const nextDeviceId = event.currentTarget.value;
                    setSelectedDeviceId(nextDeviceId);
                    void openCamera(nextDeviceId);
                  }}
                >
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `${copy.cameraFallback} ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="camera-actions">
              {cameraState === "preview" ? (
                <>
                  {!cameraSession ? (
                    <button
                      className="primary-button"
                      type="button"
                      disabled={pairingState === "creating"}
                      onClick={() => void createPairingSession()}
                    >
                      {pairingState === "creating" ? copy.creatingPairing : copy.createPairing}
                    </button>
                  ) : null}
                  <button className="primary-button stop-button" type="button" onClick={stopCamera}>{cameraSession ? "Stop Monitoring" : copy.stopCamera}</button>
                </>
              ) : (
                <button className="primary-button" type="button" disabled={cameraState === "requesting"} onClick={() => void openCamera()}>
                  {cameraState === "requesting" ? copy.startingCamera : cameraState === "error" ? copy.tryAgain : copy.startCamera}
                </button>
              )}
            </div>
            {cameraSession && cameraState === "preview" ? (
              <section className="camera-audio-console" aria-labelledby="camera-audio-title">
                <div className="camera-audio-heading">
                  <h2 id="camera-audio-title">{copy.cameraAudioTitle}</h2>
                  <p>{copy.cameraAudioHelp}</p>
                </div>
                <div className="camera-audio-grid">
                  <div className="media-control-card room-audio-control-card">
                    <div>
                      <strong>{copy.roomAudio}</strong>
                      <p className={microphoneOn ? "audio-state audio-state-on" : "audio-state"} role="status" aria-label={microphoneOn ? copy.microphoneOn : copy.microphoneOff}>
                        {microphoneRequesting ? copy.microphoneStarting : microphoneOn ? copy.microphoneOn : copy.microphoneOff}
                      </p>
                    </div>
                    <button className="regenerate-button room-audio-toggle" type="button" aria-pressed={microphoneOn} disabled={microphoneRequesting} onClick={() => void toggleMicrophone()}>
                      {microphoneRequesting ? copy.microphoneStarting : microphoneOn ? copy.disableMicrophone : copy.enableMicrophone}
                    </button>
                  </div>
                  <div className="media-control-card speaker-control-card">
                    <div>
                      <strong>Speaker</strong>
                      <p className={speakerState === "ready" ? "audio-state audio-state-on" : "audio-state"} role="status" aria-label={speakerState === "ready" ? copy.speakerReady : copy.speakerNotReady}>
                        {speakerState === "checking" ? copy.speakerChecking : speakerState === "ready" ? copy.speakerReady : copy.speakerNotReady}
                      </p>
                      <p className="audio-state">{copy.speakerHelp}</p>
                    </div>
                    <button className="regenerate-button" type="button" disabled={speakerState === "checking" || alarmPlaying} onClick={() => void enableSpeaker()}>
                      {speakerState === "checking" ? copy.speakerChecking : speakerState === "ready" ? copy.testSpeakerAgain : copy.enableSpeaker}
                    </button>
                  </div>
                  <div className="media-control-card talk-status-card">
                    <strong>Talk status</strong>
                    <p className={viewerTalking ? "audio-state audio-state-on" : "audio-state"} role="status">
                      {viewerTalking ? copy.viewerTalking : copy.viewerNotTalking}
                    </p>
                  </div>
                  {alarmPlaying ? (
                    <div className="media-control-card alarm-state-card">
                      <p className="audio-state audio-state-on" role="status">{copy.alarmPlaying}</p>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
            {speakerError ? <div className="camera-error" role="alert"><strong>!</strong><p>{speakerError}</p></div> : null}
            {microphoneError ? <div className="camera-error" role="alert"><strong>!</strong><p>{microphoneError}</p></div> : null}
            {pairingError ? <div className="camera-error" role="alert"><strong>!</strong><p>{pairingError}</p></div> : null}
            {errorMessage ? <div className="camera-error" role="alert"><strong>!</strong><p>{errorMessage}</p></div> : null}
          </div>

          <section className="preview-panel">
            <div className="tech-telemetry" aria-hidden="true">
              <span>CAM_NODE / 01</span>
              <span>VIDEO / {cameraState.toUpperCase()}</span>
              <span>STORE / OFF</span>
            </div>
            <div
              ref={previewFrameRef}
              className={`preview-frame preview-${cameraState}`}
              style={{
                aspectRatio: `${cameraDimensions.width} / ${cameraDimensions.height}`,
                width: cameraFrameWidth ? `${cameraFrameWidth}px` : undefined
              }}
            >
              <video ref={videoRef} autoPlay muted playsInline aria-label={copy.localPreview} />
              {cameraState !== "preview" ? (
                <div className="preview-placeholder">
                  <DeviceIcon kind="camera" large />
                  <h2>{copy.idleTitle}</h2>
                  <p>{copy.idleText}</p>
                </div>
              ) : null}
              <span className="frame-corner frame-corner-one" aria-hidden="true" />
              <span className="frame-corner frame-corner-two" aria-hidden="true" />
            </div>
            <div className="preview-meta">
              <span><b>{copy.resolution}</b>{resolution || copy.autoResolution}</span>
              <span><b>REC</b>{copy.noRecording}</span>
            </div>
            <div className="info-callout">
              <span aria-hidden="true">i</span>
              <p>{copy.phoneNote}</p>
            </div>
          </section>
        </section>

        {cameraSession && hasPairedViewer ? (
          <section className="pairing-complete-panel" aria-labelledby="pairing-complete-title">
            <span className="pairing-complete-mark" aria-hidden="true">✓</span>
            <div>
              <h2 id="pairing-complete-title">{copy.pairedViewerTitle}</h2>
              <p role="status">{viewerCount === 1 ? copy.pairedViewerConnected : copy.pairedViewerWaiting}</p>
            </div>
          </section>
        ) : cameraSession ? (
          <section className={`pairing-console${inviteExpired ? " pairing-console-expired" : ""}`} aria-labelledby="pairing-title">
            <div className="pairing-console-header">
              <div>
                <p className="eyebrow"><span aria-hidden="true">●</span> SECURE PAIR / QR + PIN</p>
                <h2 id="pairing-title">{copy.cameraPairingTitle}</h2>
              </div>
              <div className={`status-row ${inviteExpired ? "status-error" : "status-preview"}`} role="status">
                <span className="status-dot" aria-hidden="true" />
                <p>{inviteExpired ? copy.inviteExpired : copy.pairingReady}</p>
              </div>
            </div>

            <div className="pairing-console-body">
              <div className="qr-module">
                {inviteExpired ? (
                  <div className="qr-expired" aria-hidden="true"><span>×</span>QR EXPIRED</div>
                ) : qrCode ? (
                  <img src={qrCode} alt="Viewer pairing QR code" />
                ) : (
                  <div className="qr-loading" role="status">{copy.generatingQr}</div>
                )}
                {!inviteExpired ? (
                  <a href={pairUrl} target="_blank" rel="noreferrer">{copy.openPairingPage}</a>
                ) : null}
              </div>

              <div className="pin-module">
                <p>{copy.pairingHelp}</p>
                <span className="pin-label">{copy.pairingPin}</span>
                {inviteExpired ? (
                  <div className="pin-digits pin-digits-expired" aria-label={copy.inviteExpired}>••••••</div>
                ) : (
                  <div className="pin-digits" aria-label={`${copy.pairingPin} ${cameraSession.invite.pin}`}>
                    {cameraSession.invite.pin.split("").map((digit, index) => (
                      <span key={index} aria-hidden="true">{digit}</span>
                    ))}
                  </div>
                )}
                <div className="invite-expiry">
                  <span>{inviteExpired ? copy.inviteExpiredHelp : copy.expiresIn}</span>
                  {!inviteExpired ? <time dateTime={cameraSession.invite.expiresAt}>{inviteCountdown}</time> : null}
                </div>
                <button
                  className="regenerate-button"
                  type="button"
                  disabled={pairingState === "regenerating"}
                  onClick={() => void regenerateInvite()}
                >
                  {pairingState === "regenerating" ? copy.regeneratingInvite : copy.regenerateInvite}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ViewerScreen({ onHome, ...settings }: { onHome: () => void } & ScreenSettings) {
  const copy = messages[settings.locale];
  const queryInviteId = new URLSearchParams(window.location.search).get("invite") ?? "";
  const [scannedInviteId, setScannedInviteId] = useState("");
  const inviteId = opaqueValuePattern.test(queryInviteId) ? queryInviteId : scannedInviteId;
  const inviteValid = opaqueValuePattern.test(inviteId);
  const [pin, setPin] = useState("");
  const [pairingLink, setPairingLink] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [pairingState, setPairingState] = useState<ViewerPairingState>("idle");
  const [viewerError, setViewerError] = useState(queryInviteId && !opaqueValuePattern.test(queryInviteId) ? copy.invalidInviteViewer : "");
  const [liveState, setLiveState] = useState<"connecting" | "live" | "disconnected" | "ended">("connecting");
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [relayUnavailable, setRelayUnavailable] = useState(false);
  const [speakerReady, setSpeakerReady] = useState(false);
  const [talkState, setTalkState] = useState<"idle" | "requesting" | "talking" | "error">("idle");
  const [talkError, setTalkError] = useState("");
  const [roomAudioNeedsGesture, setRoomAudioNeedsGesture] = useState(false);
  const [alarmState, setAlarmState] = useState<"idle" | "sending" | "playing" | "stopping" | "finished" | "failed">("idle");
  const [connectionRoute, setConnectionRoute] = useState<"relay" | "direct" | "unknown">("unknown");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [viewerFrameWidth, setViewerFrameWidth] = useState<number>();
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveAudioRef = useRef<HTMLAudioElement>(null);
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null);
  const viewerSocketRef = useRef<Socket | null>(null);
  const pendingViewerCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const viewerRemoteDescriptionReadyRef = useRef(false);
  const talkStreamRef = useRef<MediaStream | null>(null);
  const talkSenderRef = useRef<RTCRtpSender | null>(null);
  const talkHeldRef = useRef(false);
  const liveStateRef = useRef(liveState);
  const sessionEndedRef = useRef(false);
  const speakerReadyRef = useRef(speakerReady);
  const alarmRequestIdRef = useRef<string | null>(null);
  const alarmStopRequestedRef = useRef(false);
  const alarmTimeoutRef = useRef<number | undefined>(undefined);
  const startupTimeoutRef = useRef<number | undefined>(undefined);
  const lastResumeAttemptRef = useRef(0);
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  liveStateRef.current = liveState;
  speakerReadyRef.current = speakerReady;

  const stopTalk = (publish = true) => {
    const wasActive = talkHeldRef.current || Boolean(talkStreamRef.current);
    talkHeldRef.current = false;
    const stream = talkStreamRef.current;
    const sender = talkSenderRef.current;
    talkStreamRef.current = null;
    talkSenderRef.current = null;
    if (sender) void sender.replaceTrack(null).catch(() => undefined);
    stream?.getTracks().forEach((track) => track.stop());
    if (publish && wasActive) viewerSocketRef.current?.emit("rw:talk-status", { talking: false });
    setTalkState("idle");
  };

  const stopViewerAlarm = () => {
    const requestId = alarmRequestIdRef.current;
    if (!requestId) return;
    alarmStopRequestedRef.current = true;
    setAlarmState("stopping");
    viewerSocketRef.current?.emit("rw:alarm-stop", { requestId });
  };

  const sendAlarm = () => {
    if (liveStateRef.current !== "live" || !speakerReadyRef.current || alarmRequestIdRef.current) return;
    const requestId = createAlarmRequestId();
    alarmRequestIdRef.current = requestId;
    alarmStopRequestedRef.current = false;
    setAlarmState("sending");
    viewerSocketRef.current?.emit("rw:alarm", { requestId });
    if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
    alarmTimeoutRef.current = window.setTimeout(() => {
      if (alarmRequestIdRef.current !== requestId) return;
      viewerSocketRef.current?.emit("rw:alarm-stop", { requestId });
      alarmRequestIdRef.current = null;
      setAlarmState("failed");
    }, 7_000);
  };

  const startTalk = async () => {
    if (talkHeldRef.current || liveStateRef.current !== "live" || !speakerReadyRef.current) return;
    talkHeldRef.current = true;
    setTalkError("");
    setTalkState("requesting");
    let stream: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone is unavailable");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const track = stream.getAudioTracks()[0];
      const peer = viewerPeerRef.current;
      const audioTransceiver = peer?.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "audio");
      const sender = audioTransceiver?.sender;
      if (!track || !sender || audioTransceiver?.direction !== "sendrecv") throw new Error("The live audio channel is unavailable");
      if (!talkHeldRef.current || liveStateRef.current !== "live" || !speakerReadyRef.current) {
        stream.getTracks().forEach((activeTrack) => activeTrack.stop());
        setTalkState("idle");
        return;
      }
      talkStreamRef.current = stream;
      talkSenderRef.current = sender;
      track.addEventListener("ended", () => stopTalk(), { once: true });
      await sender.replaceTrack(track);
      if (!talkHeldRef.current || liveStateRef.current !== "live" || !speakerReadyRef.current) {
        await sender.replaceTrack(null).catch(() => undefined);
        stream.getTracks().forEach((activeTrack) => activeTrack.stop());
        talkStreamRef.current = null;
        talkSenderRef.current = null;
        setTalkState("idle");
        return;
      }
      setTalkState("talking");
      viewerSocketRef.current?.emit("rw:talk-status", { talking: true });
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      viewerRemoteDescriptionReadyRef.current = Boolean(
        viewerPeerRef.current?.remoteDescription && viewerPeerRef.current.signalingState === "stable"
      );
      if (!talkHeldRef.current) return;
      stopTalk(false);
      setTalkState("error");
      setTalkError(copy.talkError);
    }
  };

  useEffect(() => {
    if (!scanOpen || inviteValid || pairingState === "paired" || !scannerVideoRef.current) return;
    let cancelled = false;
    let controls: IScannerControls | undefined;
    const videoElement = scannerVideoRef.current;
    void import("@zxing/browser").then(({ BrowserMultiFormatReader }) => {
      if (cancelled) return undefined;
      const reader = new BrowserMultiFormatReader();
      return reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } }, videoElement, (result, _error, activeControls) => {
        if (!result || cancelled) return;
        const scannedInvite = inviteIdFromPairingText(result.getText());
        if (!scannedInvite) {
          setScannerError(copy.invalidInviteViewer);
          return;
        }
        activeControls.stop();
        controls = activeControls;
        scannerControlsRef.current = null;
        setScannerError("");
        setViewerError("");
        setPin("");
        setScannedInviteId(scannedInvite);
        setScanOpen(false);
      }).then((startedControls) => {
        if (!startedControls) return;
        if (cancelled) startedControls.stop();
        else {
          controls = startedControls;
          scannerControlsRef.current = startedControls;
        }
      });
    }).catch(() => {
      if (!cancelled) {
        setScanOpen(false);
        setScannerError(copy.scanUnavailable);
      }
    });
    return () => {
      cancelled = true;
      controls?.stop();
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [scanOpen, inviteValid, pairingState, copy.invalidInviteViewer, copy.scanUnavailable]);

  useEffect(() => {
    if (queryInviteId || pairingState === "paired") return;
    let cancelled = false;
    void fetch("/api/viewer-session", {
      headers: { Accept: "application/json" },
      credentials: "include"
    }).then((response) => {
      if (!cancelled && response.ok) setPairingState("paired");
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [queryInviteId, pairingState]);

  useEffect(() => {
    if (pairingState !== "paired") {
      setViewerFrameWidth(undefined);
      return;
    }
    const video = liveVideoRef.current;
    const stage = video?.parentElement;
    if (!video || !stage) return;
    const fitFrame = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const width = fitVideoFrameWidth(stage.clientWidth, video.videoWidth || 16, video.videoHeight || 9, viewportHeight, 160);
      if (width !== undefined) setViewerFrameWidth(width);
    };
    fitFrame();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(fitFrame);
    observer?.observe(stage);
    video.addEventListener("loadedmetadata", fitFrame);
    video.addEventListener("resize", fitFrame);
    window.addEventListener("resize", fitFrame);
    window.visualViewport?.addEventListener("resize", fitFrame);
    return () => {
      observer?.disconnect();
      video.removeEventListener("loadedmetadata", fitFrame);
      video.removeEventListener("resize", fitFrame);
      window.removeEventListener("resize", fitFrame);
      window.visualViewport?.removeEventListener("resize", fitFrame);
    };
  }, [pairingState, connectionAttempt]);

  useEffect(() => {
    if (pairingState !== "paired") return;
    let wasHidden = document.visibilityState === "hidden";
    const reconnect = () => {
      if (sessionEndedRef.current) return;
      const now = Date.now();
      if (now - lastResumeAttemptRef.current < 1_000) return;
      lastResumeAttemptRef.current = now;
      setLiveState("connecting");
      setConnectionRoute("unknown");
      setConnectionAttempt((attempt) => attempt + 1);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") wasHidden = true;
      else if (wasHidden) {
        wasHidden = false;
        reconnect();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reconnect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [pairingState]);

  useEffect(() => {
    if (pairingState !== "paired") return;
    if (typeof RTCPeerConnection === "undefined") {
      setLiveState("disconnected");
      return;
    }
    sessionEndedRef.current = false;
    setRelayUnavailable(false);
    let socket: Socket | undefined;
    let cancelled = false;
    let peer: RTCPeerConnection | null = null;
    let routeTimer: number | undefined;
    startupTimeoutRef.current = window.setTimeout(() => {
      if (liveStateRef.current === "live" || liveStateRef.current === "ended") return;
      setConnectionTimedOut(true);
      setLiveState("disconnected");
    }, 20_000);
    void (async () => {
      try {
        const connectionInfo = await getViewerConnectionInfo();
        if (!connectionInfo) throw new Error("Viewer session unavailable");
        if (cancelled) return;
        setRelayUnavailable(!connectionInfo.iceServers.some((server) => [server.urls].flat().some((url) => /^turns?:/i.test(url))));
        peer = new RTCPeerConnection({ iceServers: connectionInfo.iceServers });
        viewerPeerRef.current = peer;
        pendingViewerCandidatesRef.current = [];
        viewerRemoteDescriptionReadyRef.current = false;
        peer.onconnectionstatechange = () => {
          if (!sessionEndedRef.current && (peer?.connectionState === "failed" || peer?.connectionState === "disconnected")) {
            if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
            setLiveState("disconnected");
            stopTalk(false);
          }
        };
        peer.ontrack = (event) => {
          if (sessionEndedRef.current) return;
          if (event.track.kind === "video") {
            const video = liveVideoRef.current;
            if (!video) return;
            video.srcObject = event.streams[0] ?? new MediaStream([event.track]);
            void video.play().catch(() => {
              if (!sessionEndedRef.current) setLiveState("disconnected");
            });
            return;
          }
          if (event.track.kind === "audio") {
            const audio = liveAudioRef.current;
            if (!audio) return;
            audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
            void audio.play().then(() => setRoomAudioNeedsGesture(false)).catch(() => setRoomAudioNeedsGesture(true));
          }
        };
        peer.onicecandidate = (event) => { if (event.candidate) socket?.emit("rw:signal", { type: "ice", payload: event.candidate }); };
        socket = io({ auth: { role: "viewer" }, transports: ["websocket"] });
        viewerSocketRef.current = socket;
        socket.on("disconnect", () => {
          if (sessionEndedRef.current) return;
          if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
          if (liveAudioRef.current) liveAudioRef.current.srcObject = null;
          speakerReadyRef.current = false;
          setSpeakerReady(false);
          stopTalk(false);
          if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
          alarmTimeoutRef.current = undefined;
          alarmRequestIdRef.current = null;
          setAlarmState("failed");
          setLiveState("disconnected");
        });
        socket.on("rw:session-ended", () => {
          sessionEndedRef.current = true;
          if (startupTimeoutRef.current !== undefined) window.clearTimeout(startupTimeoutRef.current);
          startupTimeoutRef.current = undefined;
          if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
          alarmTimeoutRef.current = undefined;
          alarmRequestIdRef.current = null;
          alarmStopRequestedRef.current = false;
          if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
          if (liveAudioRef.current) liveAudioRef.current.srcObject = null;
          if (peer) {
            peer.onconnectionstatechange = null;
            peer.ontrack = null;
            peer.close();
            peer = null;
          }
          viewerPeerRef.current = null;
          speakerReadyRef.current = false;
          setSpeakerReady(false);
          stopTalk(false);
          setAlarmState("idle");
          setLiveState("ended");
          socket?.disconnect();
        });
        socket.on("rw:speaker-status", (event: { ready: boolean }) => {
          const ready = event.ready === true;
          speakerReadyRef.current = ready;
          setSpeakerReady(ready);
          if (!ready) {
            stopTalk(false);
            stopViewerAlarm();
          }
        });
        socket.on("rw:alarm-result", (event: { requestId: string; status: "started" | "failed" | "ended" }) => {
          if (!event || event.requestId !== alarmRequestIdRef.current) return;
          if (event.status === "started") {
            if (!alarmStopRequestedRef.current) setAlarmState("playing");
            if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
            alarmTimeoutRef.current = window.setTimeout(() => {
              if (alarmRequestIdRef.current !== event.requestId) return;
              viewerSocketRef.current?.emit("rw:alarm-stop", { requestId: event.requestId });
              alarmRequestIdRef.current = null;
              setAlarmState("failed");
            }, 6_500);
            return;
          }
          if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
          alarmTimeoutRef.current = undefined;
          alarmRequestIdRef.current = null;
          alarmStopRequestedRef.current = false;
          setAlarmState(event.status === "ended" ? "finished" : "failed");
        });
        socket.on("rw:peer-left", (event: { role: string }) => {
          if (event.role === "camera" && !sessionEndedRef.current) {
            if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
            if (liveAudioRef.current) liveAudioRef.current.srcObject = null;
            speakerReadyRef.current = false;
            setSpeakerReady(false);
            stopTalk(false);
            alarmRequestIdRef.current = null;
            if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
            alarmTimeoutRef.current = undefined;
            setAlarmState("failed");
            setLiveState("disconnected");
          }
        });
        socket.on("rw:viewer-replaced", () => {
          peer?.close();
          if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
          if (liveAudioRef.current) liveAudioRef.current.srcObject = null;
          stopTalk(false);
          alarmRequestIdRef.current = null;
          if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
          alarmTimeoutRef.current = undefined;
          setAlarmState("failed");
          setLiveState("disconnected");
        });
        socket.on("rw:error", () => {
          if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
          if (liveAudioRef.current) liveAudioRef.current.srcObject = null;
          stopTalk(false);
          alarmRequestIdRef.current = null;
          if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
          alarmTimeoutRef.current = undefined;
          setAlarmState("failed");
          setLiveState("disconnected");
        });
        socket.on("rw:signal", async (message: { type: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit }) => {
          if (!peer) return;
          try {
            if (message.type === "offer") {
              viewerRemoteDescriptionReadyRef.current = false;
              await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
              viewerRemoteDescriptionReadyRef.current = true;
              const talkTransceiver = peer.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "audio");
              if (talkTransceiver) talkTransceiver.direction = "sendrecv";
              for (const candidate of pendingViewerCandidatesRef.current.splice(0)) await peer.addIceCandidate(candidate);
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              socket?.emit("rw:signal", { type: "answer", payload: answer });
            } else if (message.type === "answer") {
              viewerRemoteDescriptionReadyRef.current = false;
              await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
              viewerRemoteDescriptionReadyRef.current = true;
              for (const candidate of pendingViewerCandidatesRef.current.splice(0)) await peer.addIceCandidate(candidate);
            } else if (message.type === "ice") {
              if (!viewerRemoteDescriptionReadyRef.current || !peer.remoteDescription) {
                pendingViewerCandidatesRef.current.push(message.payload as RTCIceCandidateInit);
              } else await peer.addIceCandidate(message.payload as RTCIceCandidateInit);
            }
          } catch {
            setLiveState("disconnected");
          }
        });
        routeTimer = window.setInterval(async () => {
          if (!peer || peer.connectionState !== "connected") return;
          const stats = await peer.getStats().catch(() => null);
          if (!stats) return;
          for (const item of stats.values()) {
            if (item.type !== "candidate-pair" || !item.selected) continue;
            const local = stats.get(item.localCandidateId);
            if (local?.candidateType) setConnectionRoute(local.candidateType === "relay" ? "relay" : "direct");
          }
        }, 2_000);
      } catch (error) {
        if (!cancelled) setLiveState(error instanceof Error && error.message === "Viewer session ended" ? "ended" : "disconnected");
      }
    })();
    return () => {
      cancelled = true;
      if (startupTimeoutRef.current !== undefined) window.clearTimeout(startupTimeoutRef.current);
      if (routeTimer !== undefined) window.clearInterval(routeTimer);
      stopTalk(false);
      stopViewerAlarm();
      if (alarmTimeoutRef.current !== undefined) window.clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = undefined;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      if (liveAudioRef.current) liveAudioRef.current.srcObject = null;
      if (peer) {
        peer.onconnectionstatechange = null;
        peer.ontrack = null;
      }
      peer?.close();
      viewerPeerRef.current = null;
      socket?.disconnect();
      viewerSocketRef.current = null;
    };
  }, [pairingState, connectionAttempt]);

  const submitPairing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteValid || !/^\d{6}$/.test(pin)) return;
    setPairingState("submitting");
    setViewerError("");

    try {
      const response = await fetch("/api/pairing", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ inviteId, pin })
      });
      if (!response.ok) {
        setPairingState("idle");
        setViewerError(response.status === 429 ? copy.pairingLimitedViewer : copy.pairingUnavailableViewer);
        return;
      }

      setPin("");
      setPairingState("paired");
      window.history.replaceState({}, "", "/viewer");
    } catch {
      setPairingState("idle");
      setViewerError(copy.pairingUnavailableViewer);
    }
  };

  const usePairingLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const foundInvite = inviteIdFromPairingText(pairingLink);
    if (!foundInvite) {
      setScannerError(copy.invalidInviteViewer);
      return;
    }
    scannerControlsRef.current?.stop();
    setScanOpen(false);
    setScannerError("");
    setViewerError("");
    setPin("");
    setScannedInviteId(foundInvite);
  };

  const statusText = pairingState === "paired"
    ? liveState === "ended" ? copy.monitoringEnded : liveState === "live" ? "Live" : liveState === "disconnected" ? "Disconnected" : "Connecting"
    : copy.waitingPair;
  const statusClass = pairingState === "paired"
    ? liveState === "live" ? "status-live" : liveState === "disconnected" || liveState === "ended" ? "status-error" : "status-requesting"
    : viewerError || scannerError
      ? "status-error"
      : "status-idle";

  return (
    <main className={`page-shell${pairingState === "paired" ? " viewer-live-shell" : ""}`}>
      <div className="tech-grid" aria-hidden="true" />
      <div className={`app-surface role-surface${pairingState === "paired" ? " viewer-live-surface" : ""}`}>
        <AppHeader mode="viewer" onHome={onHome} {...settings} />
        <section className={`role-layout viewer-layout${pairingState === "paired" ? " viewer-live-layout" : ""}${liveState === "live" ? " viewer-stream-live" : ""}`} aria-labelledby="viewer-title">
          <div className="role-intro">
            <button className="text-button" type="button" onClick={onHome}>← {pairingState === "paired" ? copy.stopViewing : copy.back}</button>
            <p className="eyebrow"><span aria-hidden="true">●</span> {copy.viewerEyebrow}</p>
            <h1 id="viewer-title">{copy.viewerTitle}</h1>
            <p className="intro">{copy.viewerIntro}</p>
          </div>
          <section className="setup-panel viewer-panel" aria-labelledby="viewer-status-title">
            <div className={`status-row ${statusClass}`}>
              <span className="status-dot" aria-hidden="true" />
              <p id="viewer-status-title">{statusText}</p>
            </div>

            {pairingState === "paired" ? (
              <div className="viewer-paired">
                <video ref={liveVideoRef} style={{ width: viewerFrameWidth ? `${viewerFrameWidth}px` : undefined }} autoPlay muted playsInline aria-label="Live room video" onPlaying={() => {
                  if (sessionEndedRef.current) return;
                  if (startupTimeoutRef.current !== undefined) window.clearTimeout(startupTimeoutRef.current);
                  startupTimeoutRef.current = undefined;
                  setConnectionTimedOut(false);
                  setLiveState("live");
                }} onStalled={() => {
                  if (sessionEndedRef.current) return;
                  if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
                  setConnectionTimedOut(false);
                  setLiveState("disconnected");
                }} />
                <audio ref={liveAudioRef} autoPlay playsInline className="visually-hidden" />
                <h2>{copy.viewerPaired}</h2>
                <p>{liveState === "ended" ? copy.monitoringEnded : liveState === "disconnected" ? connectionTimedOut ? copy.connectionTimeout : "Connection unavailable. Retry to reconnect without pairing again." : copy.viewerPairedHelp}</p>
                {relayUnavailable && liveState !== "live" && liveState !== "ended" ? <p className="talk-error" role="alert">{copy.relayUnavailable}</p> : null}
                {liveState === "live" ? (
                  <section className="viewer-audio-console" aria-label={copy.roomAudio}>
                    <div className="viewer-audio-heading">
                      <div>
                        <strong>{copy.roomAudio}</strong>
                        <p>{copy.viewerAudioHelp}</p>
                      </div>
                      {roomAudioNeedsGesture ? (
                        <button className="regenerate-button audio-unlock-button" type="button" onClick={() => {
                          void liveAudioRef.current?.play().then(() => setRoomAudioNeedsGesture(false)).catch(() => setRoomAudioNeedsGesture(true));
                        }}>{copy.tapToHearAudio}</button>
                      ) : <span className="audio-playback-ready" role="status">{copy.audioPlaybackReady}</span>}
                    </div>
                    <div className="viewer-audio-actions">
                  <div className="viewer-media-controls">
                    <div className="talk-control-copy">
                      <p className="audio-state" role="status" aria-live="polite">
                        {talkState === "requesting" ? copy.requestingTalk : talkState === "talking" ? copy.talking : speakerReady ? copy.holdToTalk : copy.speakerRequired}
                      </p>
                      {talkError ? <p className="talk-error" role="alert">{talkError}</p> : null}
                    </div>
                    <button
                      className={`primary-button hold-to-talk${talkState === "talking" ? " hold-to-talk-active" : ""}`}
                      type="button"
                      aria-label={talkState === "talking" ? copy.talking : copy.holdToTalk}
                      aria-pressed={talkState === "talking"}
                      disabled={!speakerReady || liveState !== "live"}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.setPointerCapture?.(event.pointerId);
                        void startTalk();
                      }}
                      onPointerUp={() => stopTalk()}
                      onPointerCancel={() => stopTalk()}
                      onLostPointerCapture={() => stopTalk()}
                      onKeyDown={(event) => {
                        if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
                          event.preventDefault();
                          void startTalk();
                        }
                      }}
                      onKeyUp={(event) => {
                        if (event.code === "Space" || event.code === "Enter") stopTalk();
                      }}
                      onBlur={() => stopTalk()}
                    >
                      {talkState === "requesting" ? copy.requestingTalk : talkState === "talking" ? copy.talking : copy.holdToTalk}
                    </button>
                    {!speakerReady ? <p className="audio-state">{copy.speakerRequired}</p> : null}
                  </div>
                  <div className="viewer-alarm-controls">
                    <button
                      className="primary-button sound-alarm-button"
                      type="button"
                      disabled={!speakerReady || alarmState === "sending" || alarmState === "playing" || alarmState === "stopping"}
                      onClick={sendAlarm}
                    >
                      {alarmState === "sending" ? copy.sendingAlarm : alarmState === "playing" ? copy.alarmPlaying : copy.soundAlarm}
                    </button>
                    {alarmState === "sending" || alarmState === "playing" || alarmState === "stopping" ? (
                      <button className="regenerate-button stop-alarm-button" type="button" disabled={alarmState === "stopping"} onClick={stopViewerAlarm}>
                        {alarmState === "stopping" ? copy.alarmStopping : copy.stopAlarm}
                      </button>
                    ) : null}
                    {alarmState === "finished" ? <p className="audio-state audio-state-on" role="status">{copy.alarmFinished}</p> : null}
                    {alarmState === "failed" ? <p className="talk-error" role="alert">{copy.alarmFailed}</p> : null}
                  </div>
                    </div>
                  </section>
                ) : null}
                <button className="regenerate-button stop-viewing-button" type="button" onClick={onHome}>{copy.stopViewing}</button>
                {liveState === "disconnected" ? <button className="primary-button viewer-retry-button" type="button" onClick={() => {
                  setConnectionTimedOut(false);
                  setLiveState("connecting");
                  setConnectionRoute("unknown");
                  setConnectionAttempt((attempt) => attempt + 1);
                }}>{copy.retryConnection}</button> : null}
                {liveState === "live" ? <p role="status">Connection route: {connectionRoute === "relay" ? "Relay" : connectionRoute === "direct" ? "Direct" : "Checking"}</p> : null}
              </div>
            ) : inviteValid ? (
              <form className="viewer-pairing-form" onSubmit={(event) => void submitPairing(event)}>
                <DeviceIcon kind="viewer" large />
                <h2>{copy.enterPinTitle}</h2>
                <p>{copy.enterPinHelp}</p>
                <label>
                  <span>{copy.pinInputLabel}</span>
                  <input
                    aria-label={copy.pinInputLabel}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    value={pin}
                    onChange={(event) => setPin(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </label>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={pin.length !== 6 || pairingState === "submitting"}
                >
                  {pairingState === "submitting" ? copy.pairingViewer : copy.pairViewer}
                </button>
              </form>
            ) : (
              <div className="viewer-scan-panel">
                <DeviceIcon kind="viewer" large />
                <h2>{copy.pairingTitle}</h2>
                <ol className="step-list">
                  <li><span>1</span> {copy.pairingStep1}</li>
                  <li><span>2</span> {copy.pairingStep2}</li>
                  <li><span>3</span> {copy.pairingStep3}</li>
                </ol>
                {scanOpen ? (
                  <div className="qr-scanner">
                    <p>{copy.scanHelp}</p>
                    <video ref={scannerVideoRef} autoPlay muted playsInline aria-label={copy.scanQr} />
                    <button className="regenerate-button" type="button" onClick={() => setScanOpen(false)}>{copy.stopScan}</button>
                  </div>
                ) : (
                  <button className="primary-button scan-button" type="button" onClick={() => { setScannerError(""); setScanOpen(true); }}>{copy.scanQr}</button>
                )}
                <form className="pairing-link-form" onSubmit={usePairingLink}>
                  <label>
                    <span>{copy.pairingLinkLabel}</span>
                    <input aria-label={copy.pairingLinkLabel} autoComplete="url" inputMode="url" placeholder={copy.pairingLinkPlaceholder} value={pairingLink} onChange={(event) => setPairingLink(event.currentTarget.value)} />
                  </label>
                  <button className="regenerate-button" type="submit">{copy.usePairingLink}</button>
                </form>
              </div>
            )}
            {viewerError || scannerError ? <div className="camera-error" role="alert"><strong>!</strong><p>{viewerError || scannerError}</p></div> : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function DeviceIcon({ kind, large = false }: { kind: "camera" | "viewer"; large?: boolean }) {
  const className = `device-icon${large ? " device-icon-large" : ""}`;
  if (kind === "camera") {
    return (
      <span className={className} aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false">
          <rect x="7" y="14" width="25" height="20" rx="5" />
          <path d="m32 20 9-5v18l-9-5z" />
          <circle cx="19.5" cy="24" r="4.5" />
        </svg>
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 48 48" focusable="false">
        <rect x="8" y="10" width="32" height="24" rx="4" />
        <path d="M18 39h12M24 34v5" />
        <path d="M16 18h16M16 24h10" />
      </svg>
    </span>
  );
}
