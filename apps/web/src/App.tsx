import { useEffect, useState } from "react";

type Mode = "home" | "camera" | "viewer";

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

  const navigate = (path: "/" | "/camera" | "/viewer") => {
    window.history.pushState({}, "", path);
    setMode(pathToMode(path));
  };

  if (mode === "camera") {
    return <ModePlaceholder mode="Camera" description="Set this device up as the room camera." onBack={() => navigate("/")} />;
  }

  if (mode === "viewer") {
    return <ModePlaceholder mode="Viewer" description="Use this device to view a paired room." onBack={() => navigate("/")} />;
  }

  return (
    <main className="page-shell">
      <section className="home-card" aria-labelledby="home-title">
        <p className="eyebrow">RW</p>
        <h1 id="home-title">Choose how this device will be used</h1>
        <p className="intro">Use one device in the room as a camera, or use another device to view a paired room.</p>

        <div className="mode-grid">
          <button className="mode-button" type="button" onClick={() => navigate("/camera")}>
            <span className="mode-icon" aria-hidden="true">●</span>
            <span>
              <strong>Camera Mode</strong>
              <small>Set up this device in the room</small>
            </span>
          </button>

          <button className="mode-button" type="button" onClick={() => navigate("/viewer")}>
            <span className="mode-icon" aria-hidden="true">◉</span>
            <span>
              <strong>Viewer Mode</strong>
              <small>Watch a paired room from this device</small>
            </span>
          </button>
        </div>

        <p className="setup-note">Camera access and live viewing are not enabled in this setup screen.</p>
      </section>
    </main>
  );
}

function ModePlaceholder({ mode, description, onBack }: { mode: "Camera" | "Viewer"; description: string; onBack: () => void }) {
  return (
    <main className="page-shell">
      <section className="home-card placeholder-card" aria-labelledby="mode-title">
        <p className="eyebrow">RW · {mode} Mode</p>
        <h1 id="mode-title">{description}</h1>
        <p className="intro">This route is ready. Camera access, pairing, and live media will be added in later tasks.</p>
        <button className="back-button" type="button" onClick={onBack}>Back to home</button>
      </section>
    </main>
  );
}
