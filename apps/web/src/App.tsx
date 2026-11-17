import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Mode = "home" | "camera" | "viewer";
type AppPath = "/" | "/camera" | "/viewer";
type Locale = "en" | "my";
type Theme = "dark" | "light";
type CameraState = "idle" | "requesting" | "preview" | "error";
type PairingState = "idle" | "creating" | "ready" | "regenerating";

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
    pairingStep3: "View the room live after pairing."
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
    pairingStep3: "Pair ပြီးလျှင် အခန်းကို live ကြည့်ပါ။"
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

const formatCountdown = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

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
  const [cameraSession, setCameraSession] = useState<CameraSession>();
  const [pairingState, setPairingState] = useState<PairingState>("idle");
  const [pairingError, setPairingError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [clock, setClock] = useState(Date.now);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<CameraSession | undefined>(undefined);
  const operationRef = useRef(0);
  const pairingOperationRef = useRef(0);
  const mountedRef = useRef(true);

  const stopTracks = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const clearStream = () => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      pairingOperationRef.current += 1;
      stopTracks(streamRef.current);
      streamRef.current = null;
      const activeSession = sessionRef.current;
      sessionRef.current = undefined;
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
    const activeSession = sessionRef.current;
    sessionRef.current = undefined;
    setCameraSession(undefined);
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
    setResolution("");
    setErrorMessage("");
    setCameraState("idle");
  };

  const statusText = cameraState === "requesting"
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
    <main className="page-shell">
      <div className="tech-grid" aria-hidden="true" />
      <div className="app-surface role-surface camera-surface">
        <AppHeader mode="camera" onHome={onHome} {...settings} />
        <section className="camera-layout" aria-labelledby="camera-title">
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
              <p className="preview-boundary">{copy.previewOnly}</p>
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
                  <button className="primary-button stop-button" type="button" onClick={stopCamera}>{copy.stopCamera}</button>
                </>
              ) : (
                <button className="primary-button" type="button" disabled={cameraState === "requesting"} onClick={() => void openCamera()}>
                  {cameraState === "requesting" ? copy.startingCamera : cameraState === "error" ? copy.tryAgain : copy.startCamera}
                </button>
              )}
            </div>
            {pairingError ? <div className="camera-error" role="alert"><strong>!</strong><p>{pairingError}</p></div> : null}
            {errorMessage ? <div className="camera-error" role="alert"><strong>!</strong><p>{errorMessage}</p></div> : null}
          </div>

          <section className="preview-panel">
            <div className="tech-telemetry" aria-hidden="true">
              <span>CAM_NODE / 01</span>
              <span>VIDEO / {cameraState.toUpperCase()}</span>
              <span>STORE / OFF</span>
            </div>
            <div className={`preview-frame preview-${cameraState}`}>
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

        {cameraSession ? (
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
  return (
    <main className="page-shell">
      <div className="tech-grid" aria-hidden="true" />
      <div className="app-surface role-surface">
        <AppHeader mode="viewer" onHome={onHome} {...settings} />
        <section className="role-layout" aria-labelledby="viewer-title">
          <div className="role-intro">
            <button className="text-button" type="button" onClick={onHome}>← {copy.back}</button>
            <p className="eyebrow"><span aria-hidden="true">●</span> {copy.viewerEyebrow}</p>
            <h1 id="viewer-title">{copy.viewerTitle}</h1>
            <p className="intro">{copy.viewerIntro}</p>
          </div>
          <section className="setup-panel viewer-panel" aria-labelledby="viewer-status-title">
            <div className="status-row status-idle">
              <span className="status-dot" aria-hidden="true" />
              <p id="viewer-status-title">{copy.waitingPair}</p>
            </div>
            <DeviceIcon kind="viewer" large />
            <h2>{copy.pairingTitle}</h2>
            <ol className="step-list">
              <li><span>1</span> {copy.pairingStep1}</li>
              <li><span>2</span> {copy.pairingStep2}</li>
              <li><span>3</span> {copy.pairingStep3}</li>
            </ol>
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
