import { useEffect, useState } from "react";

type Mode = "home" | "camera" | "viewer";
type AppPath = "/" | "/camera" | "/viewer";

const pathToMode = (path: string): Mode => {
  if (path === "/camera") return "camera";
  if (path === "/viewer") return "viewer";
  return "home";
};

export default function App() {
  const [mode, setMode] = useState<Mode>(() => pathToMode(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setMode(pathToMode(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: AppPath) => {
    window.history.pushState({}, "", path);
    setMode(pathToMode(path));
  };

  if (mode === "camera") {
    return <CameraScreen onHome={() => navigate("/")} />;
  }

  if (mode === "viewer") {
    return <ViewerScreen onHome={() => navigate("/")} />;
  }

  return <HomeScreen onNavigate={navigate} />;
}

function AppHeader({ onHome, mode }: { onHome?: () => void; mode?: "Camera" | "Viewer" }) {
  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={onHome} aria-label="Go to RW home">
        <span aria-hidden="true" className="brand-mark">RW</span>
        <span className="brand-copy">
          <strong>Room Watch</strong>
          <small>Live room monitoring</small>
        </span>
      </button>
      {mode ? <p className="mode-label">{mode} mode</p> : <p className="mode-label">Choose a device role</p>}
    </header>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  return (
    <main className="page-shell">
      <div className="app-surface">
        <AppHeader />
        <section className="home-hero" aria-labelledby="home-title">
          <p className="eyebrow">Set up this device</p>
          <h1 id="home-title">How would you like to use RW?</h1>
          <p className="intro">Choose one role for this device. You can open RW on a second device to use the other role.</p>

          <div className="mode-grid">
            <button className="mode-button camera-choice" type="button" onClick={() => onNavigate("/camera")}>
              <DeviceIcon kind="camera" />
              <span className="mode-copy">
                <strong>Use as camera</strong>
                <small>Place this laptop or phone in the room.</small>
              </span>
              <span className="button-arrow" aria-hidden="true">→</span>
            </button>

            <button className="mode-button viewer-choice" type="button" onClick={() => onNavigate("/viewer")}>
              <DeviceIcon kind="viewer" />
              <span className="mode-copy">
                <strong>Use as viewer</strong>
                <small>Watch a paired room from this device.</small>
              </span>
              <span className="button-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <aside className="privacy-note" aria-label="Privacy note">
          <span className="privacy-dot" aria-hidden="true" />
          <p><strong>Live only.</strong> RW does not save video or audio.</p>
        </aside>
      </div>
    </main>
  );
}

function CameraScreen({ onHome }: { onHome: () => void }) {
  return (
    <main className="page-shell">
      <div className="app-surface role-surface">
        <AppHeader mode="Camera" onHome={onHome} />
        <section className="role-layout" aria-labelledby="camera-title">
          <div className="role-intro">
            <button className="text-button" type="button" onClick={onHome}>← Back to roles</button>
            <p className="eyebrow">Camera device</p>
            <h1 id="camera-title">Set up this room camera</h1>
            <p className="intro">Keep this device in the room and leave RW open while monitoring is in progress.</p>
          </div>

          <section className="setup-panel camera-panel" aria-labelledby="camera-status-title">
            <div className="status-row">
              <span className="status-dot status-idle" aria-hidden="true" />
              <p id="camera-status-title">Not monitoring</p>
            </div>
            <DeviceIcon kind="camera" large />
            <h2>Camera setup is ready</h2>
            <p>Camera access has not started. The next step will ask for permission and show a local preview.</p>
            <div className="info-callout">
              <span aria-hidden="true">i</span>
              <p>For phone use, keep the screen on and RW in the foreground.</p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ViewerScreen({ onHome }: { onHome: () => void }) {
  return (
    <main className="page-shell">
      <div className="app-surface role-surface">
        <AppHeader mode="Viewer" onHome={onHome} />
        <section className="role-layout" aria-labelledby="viewer-title">
          <div className="role-intro">
            <button className="text-button" type="button" onClick={onHome}>← Back to roles</button>
            <p className="eyebrow">Viewer device</p>
            <h1 id="viewer-title">Watch a paired room</h1>
            <p className="intro">Use the QR code and PIN shown on the room camera when pairing becomes available.</p>
          </div>

          <section className="setup-panel viewer-panel" aria-labelledby="viewer-status-title">
            <div className="status-row">
              <span className="status-dot status-idle" aria-hidden="true" />
              <p id="viewer-status-title">Waiting to pair</p>
            </div>
            <DeviceIcon kind="viewer" large />
            <h2>Pairing will happen here</h2>
            <ol className="step-list">
              <li><span>1</span> Scan the QR code on the camera device.</li>
              <li><span>2</span> Enter the six-digit PIN shown there.</li>
              <li><span>3</span> View the room live after pairing.</li>
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
