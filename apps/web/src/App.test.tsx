import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { BrowserMultiFormatReader } from "@zxing/browser";
import App from "./App";

type FakeTrack = {
  stop: ReturnType<typeof vi.fn>;
  getSettings: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const originalPlay = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "play");

const cameraDevice = (deviceId: string, label: string) => ({
  deviceId,
  groupId: "rw-test-group",
  kind: "videoinput" as const,
  label,
  toJSON: () => ({})
});

const makeStream = (deviceId = "front-camera", width = 1280, height = 720) => {
  const videoTrack: FakeTrack = {
    stop: vi.fn(),
    getSettings: vi.fn(() => ({ deviceId, width, height })),
    addEventListener: vi.fn()
  };
  const extraTrack: FakeTrack = {
    stop: vi.fn(),
    getSettings: vi.fn(() => ({})),
    addEventListener: vi.fn()
  };
  const stream = {
    getTracks: vi.fn(() => [videoTrack, extraTrack]),
    getVideoTracks: vi.fn(() => [videoTrack])
  } as unknown as MediaStream;

  return { stream, videoTrack, extraTrack };
};

const installMediaDevices = (
  getUserMedia: ReturnType<typeof vi.fn>,
  enumerateDevices = vi.fn().mockResolvedValue([
    cameraDevice("front-camera", "Front Camera"),
    cameraDevice("back-camera", "Back Camera")
  ])
) => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices }
  });
  return enumerateDevices;
};

const sessionPayload = ({
  inviteId = "i".repeat(43),
  pin = "123456",
  inviteExpiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
}: {
  inviteId?: string;
  pin?: string;
  inviteExpiresAt?: string;
} = {}) => ({
  sessionId: "s".repeat(43),
  cameraToken: "t".repeat(43),
  expiresAt: new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
  invite: { inviteId, pin, expiresAt: inviteExpiresAt }
});

const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json" }
});

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined)
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.lang = "";
  if (originalMediaDevices) Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
  if (originalPlay) Object.defineProperty(HTMLMediaElement.prototype, "play", originalPlay);
  else Reflect.deleteProperty(HTMLMediaElement.prototype, "play");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RW role-selection screens", () => {
  it("shows clear camera and viewer choices on the home screen", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "How would you like to use RW?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /use as camera/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /use as viewer/i })).toBeTruthy();
    expect(screen.getByText("RW does not save video or audio.")).toBeTruthy();
  });

  it("opens the viewer pairing screen", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /use as viewer/i }));

    expect(window.location.pathname).toBe("/viewer");
    expect(screen.getByRole("heading", { name: "Watch a paired room" })).toBeTruthy();
    expect(screen.getByText("Waiting to pair")).toBeTruthy();
  });

  it("switches between EN/MYA and dark/light UI controls", () => {
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Use light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "MYA" }));
    expect(screen.getByRole("heading", { name: "RW ကို ဘယ်လိုအသုံးပြုမလဲ?" })).toBeTruthy();
    expect(document.documentElement.lang).toBe("my");
  });
});

describe("T05 camera preview", () => {
  it("does not request permission when Camera mode opens", () => {
    const getUserMedia = vi.fn();
    installMediaDevices(getUserMedia);
    window.history.replaceState({}, "", "/camera");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Set up this room camera" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start camera" })).toBeTruthy();
    expect(screen.getByText("Camera is off")).toBeTruthy();
    expect(screen.getByText("CAM_NODE / 01")).toBeTruthy();
    expect(screen.getByText("STORE / OFF")).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("starts a video-only, resolution-flexible local preview after the user clicks", async () => {
    const { stream } = makeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installMediaDevices(getUserMedia);
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));

    await waitFor(() => expect(screen.getByText("Local preview on")).toBeTruthy());
    expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: true });
    expect(screen.getByLabelText("Local camera preview").getAttribute("autoplay")).not.toBeNull();
    expect(screen.getByText("1280 × 720")).toBeTruthy();
    expect(screen.getByText("Preview only — monitoring has not started")).toBeTruthy();
    expect(screen.queryByText(/monitoring active/i)).toBeNull();
  });

  it("lists cameras after permission and switches from front to back camera", async () => {
    const first = makeStream("front-camera");
    const second = makeStream("back-camera", 1920, 1080);
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(second.stream);
    installMediaDevices(getUserMedia);
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    const selector = await screen.findByLabelText("Camera device");
    expect(screen.getByRole("option", { name: "Front Camera" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Back Camera" })).toBeTruthy();

    fireEvent.change(selector, { target: { value: "back-camera" } });

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(getUserMedia).toHaveBeenLastCalledWith({
      audio: false,
      video: { deviceId: { exact: "back-camera" } }
    });
    expect(first.videoTrack.stop).toHaveBeenCalledOnce();
    expect(first.extraTrack.stop).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByText("1920 × 1080")).toBeTruthy());
  });

  it("stops every media track when Stop camera is clicked", async () => {
    const { stream, videoTrack, extraTrack } = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Stop camera" }));

    expect(videoTrack.stop).toHaveBeenCalledOnce();
    expect(extraTrack.stop).toHaveBeenCalledOnce();
    expect(screen.getByText("Camera is off")).toBeTruthy();
  });

  it("shows an understandable recovery message when permission is denied", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    installMediaDevices(getUserMedia);
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Camera access was blocked.");
    expect(alert.textContent).toContain("browser settings");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByText(/monitoring active/i)).toBeNull();
  });

  it("shows a hardware recovery message if an active camera track ends", async () => {
    const { stream, videoTrack } = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByText("Local preview on");
    const endedHandler = videoTrack.addEventListener.mock.calls[0]?.[1] as EventListener;
    act(() => endedHandler(new Event("ended")));

    expect(screen.getByRole("alert").textContent).toContain("The camera stopped unexpectedly.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("stops active tracks when leaving Camera mode", async () => {
    const { stream, videoTrack, extraTrack } = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByRole("button", { name: "Stop camera" });
    fireEvent.click(screen.getByRole("button", { name: /back to roles/i }));

    expect(videoTrack.stop).toHaveBeenCalledOnce();
    expect(extraTrack.stop).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe("/");
  });
});

describe("T07 camera pairing display", () => {
  it("creates a QR link without the PIN and shows the PIN separately", async () => {
    const { stream } = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    const payload = sessionPayload();
    const qrSpy = vi.spyOn(QRCode, "toString");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(payload, 201);
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    expect(screen.queryByRole("button", { name: "Create pairing code" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));

    expect(await screen.findByRole("heading", { name: "Pair this viewer" })).toBeTruthy();
    expect(screen.getByLabelText("Pairing PIN 123456")).toBeTruthy();
    const pairingLink = screen.getByRole("link", { name: "Open pairing page" }) as HTMLAnchorElement;
    const pairingUrl = new URL(pairingLink.href);
    expect(pairingUrl.pathname).toBe("/viewer");
    expect(pairingUrl.searchParams.get("invite") === payload.invite.inviteId).toBe(true);
    expect(pairingUrl.searchParams.has("pin")).toBe(false);
    expect(pairingLink.href.includes(payload.invite.pin)).toBe(false);
    expect(await screen.findByRole("img", { name: "Viewer pairing QR code" })).toBeTruthy();
    expect(qrSpy.mock.calls.some(([value]) => value === pairingLink.href)).toBe(true);
    expect(screen.queryByText(/monitoring active/i)).toBeNull();
  });

  it("hides an expired QR/PIN and regenerates a fresh invite", async () => {
    const { stream } = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    const expired = sessionPayload({
      inviteExpiresAt: new Date(Date.now() - 1_000).toISOString()
    });
    const freshInvite = {
      inviteId: "n".repeat(43),
      pin: "654321",
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString()
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/invite") && init?.method === "POST") {
        return jsonResponse({ invite: freshInvite }, 201);
      }
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(expired, 201);
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));

    expect(await screen.findByText("Pairing code expired")).toBeTruthy();
    expect(screen.queryByLabelText("Pairing PIN 123456")).toBeNull();
    expect(screen.queryByRole("link", { name: "Open pairing page" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate code" }));

    expect(await screen.findByLabelText("Pairing PIN 654321")).toBeTruthy();
    const regeneratedLink = screen.getByRole("link", { name: "Open pairing page" }) as HTMLAnchorElement;
    expect(new URL(regeneratedLink.href).searchParams.get("invite") === freshInvite.inviteId).toBe(true);
    const regenerateCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/invite"));
    const regenerateHeaders = regenerateCall?.[1]?.headers as Record<string, string>;
    expect(regenerateHeaders.Authorization === `Bearer ${expired.cameraToken}`).toBe(true);
  });

  it("revokes the backend session when Stop camera is clicked", async () => {
    const media = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(media.stream));
    const payload = sessionPayload();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(payload, 201);
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    await screen.findByRole("heading", { name: "Pair this viewer" });
    fireEvent.click(screen.getByRole("button", { name: "Stop Monitoring" }));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
      expect(Boolean(deleteCall)).toBe(true);
    });
    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    const deleteHeaders = deleteCall?.[1]?.headers as Record<string, string>;
    expect(deleteHeaders.Authorization === `Bearer ${payload.cameraToken}`).toBe(true);
    expect(screen.queryByRole("heading", { name: "Pair this viewer" })).toBeNull();
    expect(media.videoTrack.stop).toHaveBeenCalledOnce();
    expect(media.extraTrack.stop).toHaveBeenCalledOnce();
  });
});

describe("T08/T10 viewer pairing and re-entry UI", () => {
  it("scans a same-site pairing QR and then asks for the separate PIN", async () => {
    window.history.replaceState({}, "", "/viewer");
    const controls = { stop: vi.fn() };
    const decodeSpy = vi.spyOn(BrowserMultiFormatReader.prototype, "decodeFromVideoDevice").mockImplementation(async (_deviceId, _video, callback) => {
      callback({ getText: () => `${window.location.origin}/viewer?invite=${"i".repeat(43)}` } as never, undefined, controls);
      return controls;
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Scan camera QR code" }));
    expect(await screen.findByLabelText("Six-digit pairing PIN")).toBeTruthy();
    expect(decodeSpy).toHaveBeenCalled();
    expect(controls.stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pair viewer" })).toBeTruthy();
  });

  it("accepts a pasted same-site pairing link when camera scanning is unavailable", async () => {
    window.history.replaceState({}, "", "/viewer");
    render(<App />);

    fireEvent.change(screen.getByLabelText("Pairing link"), {
      target: { value: `${window.location.origin}/viewer?invite=${"i".repeat(43)}` }
    });
    fireEvent.click(screen.getByRole("button", { name: "Use pairing link" }));

    expect(await screen.findByLabelText("Six-digit pairing PIN")).toBeTruthy();
  });

  it("submits the QR invite with a six-digit PIN and clears the invite URL", async () => {
    const inviteId = "i".repeat(43);
    window.history.replaceState({}, "", `/viewer?invite=${inviteId}`);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ status: "paired" })
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    const pinInput = screen.getByLabelText("Six-digit pairing PIN") as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: "12a3456" } });
    expect(pinInput.value).toBe("123456");
    fireEvent.click(screen.getByRole("button", { name: "Pair viewer" }));

    expect(await screen.findByRole("heading", { name: "Viewer paired" })).toBeTruthy();
    expect(window.location.pathname).toBe("/viewer");
    expect(window.location.search).toBe("");
    const pairingCall = fetchMock.mock.calls[0];
    expect(pairingCall?.[0] === "/api/pairing").toBe(true);
    expect(pairingCall?.[1]?.credentials === "include").toBe(true);
    const body = JSON.parse(String(pairingCall?.[1]?.body)) as Record<string, unknown>;
    expect(body.inviteId === inviteId).toBe(true);
    expect(body.pin === "123456").toBe(true);
  });

  it("rejects an invalid invite link before sending a PIN", () => {
    window.history.replaceState({}, "", "/viewer?invite=short");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    expect(screen.getByRole("alert").textContent).toContain("This pairing link is invalid.");
    expect(screen.queryByLabelText("Six-digit pairing PIN")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recognizes a returning viewer through the server-side cookie check", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ status: "paired" })
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/viewer");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Viewer paired" })).toBeTruthy();
    const sessionCall = fetchMock.mock.calls[0];
    expect(sessionCall?.[0] === "/api/viewer-session").toBe(true);
    expect(sessionCall?.[1]?.credentials === "include").toBe(true);
  });
});
