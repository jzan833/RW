import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { BrowserMultiFormatReader } from "@zxing/browser";

const socketHarness = vi.hoisted(() => {
  const sockets: Array<{
    handlers: Map<string, Array<(payload: unknown) => void>>;
    on: (event: string, handler: (payload: unknown) => void) => unknown;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    trigger: (event: string, payload?: unknown) => void;
  }> = [];
  const io = vi.fn(() => {
    const handlers = new Map<string, Array<(payload: unknown) => void>>();
    const socket = {
      handlers,
      on(event: string, handler: (payload: unknown) => void) {
        handlers.set(event, [...(handlers.get(event) ?? []), handler]);
        return socket;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
      trigger(event: string, payload?: unknown) {
        for (const handler of handlers.get(event) ?? []) handler(payload);
      }
    };
    sockets.push(socket);
    return socket;
  });
  return { io, sockets };
});

vi.mock("socket.io-client", () => ({ io: socketHarness.io }));

import App from "./App";

type FakeTrack = {
  stop: ReturnType<typeof vi.fn>;
  getSettings: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const originalPlay = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "play");
const originalAudioContext = Object.getOwnPropertyDescriptor(window, "AudioContext");
const originalPeerConnection = Object.getOwnPropertyDescriptor(window, "RTCPeerConnection");

const installAudioContext = (resume: () => Promise<void> = async () => undefined) => {
  const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended?: (() => void) | null }> = [];
  const mediaSources: Array<{ stream: MediaStream; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
  class FakeAudioContext {
    state: AudioContextState = "suspended";
    currentTime = 0;
    destination = {} as AudioDestinationNode;
    resume = vi.fn(async () => {
      await resume();
      this.state = "running";
    });
    close = vi.fn(async () => { this.state = "closed"; });
    createOscillator() {
      const oscillator = {
        type: "sine",
        frequency: { value: 0, setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null
      };
      oscillators.push(oscillator);
      return oscillator as unknown as OscillatorNode;
    }
    createGain() {
      return {
        gain: { value: 0 },
        connect: vi.fn()
      } as unknown as GainNode;
    }
    createMediaStreamSource(stream: MediaStream) {
      const source = { stream, connect: vi.fn(), disconnect: vi.fn() };
      mediaSources.push(source);
      return source as unknown as MediaStreamAudioSourceNode;
    }
  }
  Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
  return { oscillators, mediaSources };
};

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
  socketHarness.sockets.length = 0;
  socketHarness.io.mockClear();
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
  if (originalAudioContext) Object.defineProperty(window, "AudioContext", originalAudioContext);
  else Reflect.deleteProperty(window, "AudioContext");
  if (originalPeerConnection) Object.defineProperty(window, "RTCPeerConnection", originalPeerConnection);
  else Reflect.deleteProperty(window, "RTCPeerConnection");
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
    expect(document.querySelector(".camera-monitoring-shell")).toBeTruthy();
    expect(document.querySelector(".camera-preview-layout")).toBeTruthy();
    expect(document.querySelector(".preview-frame")?.getAttribute("style")).toContain("aspect-ratio: 1280 / 720");
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

  it("shows a camera-not-found message and retry action when no camera is available", async () => {
    installMediaDevices(vi.fn().mockRejectedValue(new DOMException("no camera", "NotFoundError")));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));

    expect((await screen.findByRole("alert")).textContent).toContain("No camera was found.");
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

describe("T15 opt-in camera microphone", () => {
  it("keeps microphone permission off until enabled and stops capture when turned off", async () => {
    const camera = makeStream();
    const microphoneTrack = {
      kind: "audio",
      stop: vi.fn(),
      addEventListener: vi.fn()
    };
    const microphoneStream = {
      getTracks: () => [microphoneTrack],
      getAudioTracks: () => [microphoneTrack]
    } as unknown as MediaStream;
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(camera.stream)
      .mockResolvedValueOnce(microphoneStream);
    installMediaDevices(getUserMedia);
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(sessionPayload(), 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByText("Local preview on");
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: true });
    expect(screen.queryByRole("button", { name: "Turn room audio on" })).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    const enableAudio = await screen.findByRole("button", { name: "Turn room audio on" });
    expect(screen.getByRole("status", { name: "Room audio Off" }).textContent).toBe("Room audio Off");
    expect(enableAudio.getAttribute("aria-pressed")).toBe("false");
    expect(getUserMedia).toHaveBeenCalledOnce();

    fireEvent.click(enableAudio);
    await waitFor(() => expect(screen.getByRole("status", { name: "Room audio On" }).textContent).toBe("Room audio On"));
    expect(getUserMedia).toHaveBeenLastCalledWith({ audio: true, video: false });
    expect(screen.getByRole("button", { name: "Turn room audio off" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Turn room audio off" }));
    await waitFor(() => expect(screen.getByRole("status", { name: "Room audio Off" }).textContent).toBe("Room audio Off"));
    expect(microphoneTrack.stop).toHaveBeenCalledOnce();
  });

  it("shows a permission error without claiming that room audio is on", async () => {
    const camera = makeStream();
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(camera.stream)
      .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    installMediaDevices(getUserMedia);
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(sessionPayload(), 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByText("Local preview on");
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    fireEvent.click(await screen.findByRole("button", { name: "Turn room audio on" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Microphone access failed.");
    expect(screen.getByRole("status", { name: "Room audio Off" }).textContent).toBe("Room audio Off");
  });
});

describe("T16 camera speaker readiness", () => {
  it("marks the speaker ready only after the user starts a test tone", async () => {
    const audio = installAudioContext();
    const camera = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(camera.stream));
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(sessionPayload(), 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByText("Local preview on");
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    const enableSpeaker = await screen.findByRole("button", { name: "Enable speaker" });
    expect(screen.getByRole("status", { name: "Speaker Not Ready" })).toBeTruthy();
    expect(audio.oscillators).toHaveLength(0);

    fireEvent.click(enableSpeaker);

    await screen.findByRole("button", { name: "Testing speaker…" });
    await waitFor(() => expect(audio.oscillators).toHaveLength(1));
    act(() => audio.oscillators[0].onended?.());
    await waitFor(() => expect(screen.getByRole("status", { name: "Speaker Ready" })).toBeTruthy());
    expect(audio.oscillators).toHaveLength(1);
    expect(audio.oscillators[0].start).toHaveBeenCalledOnce();
    expect(audio.oscillators[0].stop).toHaveBeenCalledOnce();
  });

  it("keeps speaker actions unavailable when browser playback is blocked", async () => {
    installAudioContext(async () => { throw new DOMException("blocked", "NotAllowedError"); });
    const camera = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(camera.stream));
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(sessionPayload(), 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByText("Local preview on");
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    fireEvent.click(await screen.findByRole("button", { name: "Enable speaker" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Speaker playback was blocked.");
    expect(screen.getByRole("status", { name: "Speaker Not Ready" })).toBeTruthy();
  });
});

describe("T18 camera local alarm", () => {
  it("plays one five-second local tone and acknowledges only after playback starts", async () => {
    class FakePeerConnection {
      close = vi.fn();
      onicecandidate: (() => void) | null = null;
      addTrack = vi.fn();
      addTransceiver() { return { sender: { replaceTrack: vi.fn(async () => undefined) } }; }
    }
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    const audio = installAudioContext();
    const camera = makeStream();
    installMediaDevices(vi.fn().mockResolvedValue(camera.stream));
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(sessionPayload(), 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByText("Local preview on");
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    fireEvent.click(await screen.findByRole("button", { name: "Enable speaker" }));
    await screen.findByRole("button", { name: "Testing speaker…" });
    await waitFor(() => expect(audio.oscillators).toHaveLength(1));
    act(() => audio.oscillators[0].onended?.());
    await screen.findByRole("status", { name: "Speaker Ready" });

    act(() => socketHarness.sockets[0].trigger("rw:alarm", { requestId: "camera-alarm-1" }));
    expect(await screen.findByText("Alarm playing")).toBeTruthy();
    expect(audio.oscillators).toHaveLength(2);
    expect(audio.oscillators[1].start).toHaveBeenCalledOnce();
    expect(audio.oscillators[1].stop).toHaveBeenCalledWith(5);
    expect(socketHarness.sockets[0].emit).toHaveBeenCalledWith("rw:alarm-result", {
      requestId: "camera-alarm-1",
      status: "started"
    });

    act(() => socketHarness.sockets[0].trigger("rw:alarm", { requestId: "camera-alarm-2" }));
    expect(audio.oscillators).toHaveLength(2);
    expect(socketHarness.sockets[0].emit).toHaveBeenCalledWith("rw:alarm-result", {
      requestId: "camera-alarm-2",
      status: "failed"
    });

    expect(screen.queryByRole("button", { name: "Stop alarm" })).toBeNull();
    expect(screen.getByText("Alarm playing")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Test speaker again" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Stop Monitoring" }));
    expect(screen.queryByText("Alarm playing")).toBeNull();
    expect(socketHarness.sockets[0].emit).toHaveBeenLastCalledWith("rw:alarm-result", {
      requestId: "camera-alarm-1",
      status: "ended"
    });
  });
});

describe("T17 camera receives viewer talk audio", () => {
  it("routes the incoming viewer microphone track to the camera speaker", async () => {
    const peers: Array<{ ontrack: ((event: RTCTrackEvent) => void) | null }> = [];
    const receivedTrack = { kind: "audio" } as MediaStreamTrack;
    class FakeMediaStream {
      constructor(private readonly tracks: MediaStreamTrack[]) {}
      getTracks() { return this.tracks; }
    }
    class FakePeerConnection {
      onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
      ontrack: ((event: RTCTrackEvent) => void) | null = null;
      addTrack = vi.fn();
      addTransceiver = vi.fn(() => ({ sender: { replaceTrack: vi.fn(async () => undefined) } }));
      createOffer = vi.fn(async () => ({ type: "offer", sdp: "camera-offer" } as RTCSessionDescriptionInit));
      createAnswer = vi.fn(async () => ({ type: "answer", sdp: "camera-answer" } as RTCSessionDescriptionInit));
      setLocalDescription = vi.fn(async () => undefined);
      setRemoteDescription = vi.fn(async () => undefined);
      addIceCandidate = vi.fn(async () => undefined);
      close = vi.fn();
      constructor() { peers.push(this); }
    }
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    vi.stubGlobal("MediaStream", FakeMediaStream);
    const audio = installAudioContext();
    const camera = makeStream();
    Object.assign(camera.videoTrack, { readyState: "live" });
    installMediaDevices(vi.fn().mockResolvedValue(camera.stream));
    const payload = sessionPayload();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      if (String(input).startsWith("/api/turn-credentials/")) return jsonResponse({ iceServers: [] });
      return jsonResponse(payload, 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await screen.findByText("Local preview on");
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    await screen.findByRole("img", { name: "Viewer pairing QR code" });
    Object.assign(socketHarness.sockets[0], { connected: true });
    act(() => socketHarness.sockets[0].trigger("rw:peer-joined", { role: "viewer" }));
    await waitFor(() => expect(peers).toHaveLength(1));

    fireEvent.click(await screen.findByRole("button", { name: "Enable speaker" }));
    await waitFor(() => expect(audio.oscillators).toHaveLength(1));
    act(() => audio.oscillators[0].onended?.());
    await screen.findByRole("status", { name: "Speaker Ready" });

    act(() => peers[0].ontrack?.({
      track: receivedTrack,
      streams: []
    } as unknown as RTCTrackEvent));

    expect(audio.mediaSources).toHaveLength(1);
    expect(audio.mediaSources[0].stream.getTracks()).toEqual([receivedTrack]);
    expect(audio.mediaSources[0].connect).toHaveBeenCalledOnce();
  });
});

describe("T17 viewer hold-to-talk", () => {
  it("requests microphone permission only while held and stops the track on release", async () => {
    const sender = { replaceTrack: vi.fn(async () => undefined) };
    const audioTransceiver = { direction: "recvonly", receiver: { track: { kind: "audio" } }, sender };
    const peers: Array<{ ontrack: ((event: unknown) => void) | null }> = [];
    let releaseQueuedCandidate: (() => void) | undefined;
    class FakePeerConnection {
      connectionState = "new";
      remoteDescription: RTCSessionDescriptionInit | null = null;
      ontrack: ((event: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      onicecandidate: (() => void) | null = null;
      constructor() { peers.push(this); }
      getTransceivers() {
        return [audioTransceiver];
      }
      createOffer = vi.fn(async () => ({ type: "offer", sdp: "talk-offer" } as RTCSessionDescriptionInit));
      createAnswer = vi.fn(async () => ({ type: "answer", sdp: "viewer-answer" } as RTCSessionDescriptionInit));
      setRemoteDescription = vi.fn(async (description: RTCSessionDescriptionInit) => { this.remoteDescription = description; });
      setLocalDescription = vi.fn(async () => undefined);
      addIceCandidate = vi.fn()
        .mockImplementationOnce(() => new Promise<void>((resolve) => { releaseQueuedCandidate = resolve; }))
        .mockResolvedValue(undefined);
      getStats = vi.fn(async () => new Map());
      close = vi.fn();
    }
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    const microphoneTrack = {
      kind: "audio",
      stop: vi.fn(),
      addEventListener: vi.fn()
    };
    const stopViewTrack = {
      kind: "audio",
      stop: vi.fn(),
      addEventListener: vi.fn()
    };
    const microphoneStream = {
      getTracks: () => [microphoneTrack],
      getAudioTracks: () => [microphoneTrack]
    } as unknown as MediaStream;
    const stopViewStream = {
      getTracks: () => [stopViewTrack],
      getAudioTracks: () => [stopViewTrack]
    } as unknown as MediaStream;
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(microphoneStream)
      .mockRejectedValueOnce(new DOMException("Microphone permission denied", "NotAllowedError"))
      .mockResolvedValueOnce(stopViewStream);
    installMediaDevices(getUserMedia);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/viewer-session") return jsonResponse({ status: "paired" });
      if (url === "/api/viewer-session/connection") return jsonResponse({ sessionId: "s".repeat(43), iceServers: [] });
      return new Response(null, { status: 404 });
    }));
    window.history.replaceState({}, "", "/viewer");
    render(<App />);

    await screen.findByText("Viewer paired");
    await waitFor(() => expect(peers).toHaveLength(1));
    act(() => socketHarness.sockets[0].trigger("rw:signal", { type: "ice", payload: { candidate: "candidate-first" } }));
    act(() => socketHarness.sockets[0].trigger("rw:signal", { type: "offer", payload: { type: "offer", sdp: "camera-offer" } }));
    await waitFor(() => expect((peers[0] as FakePeerConnection).addIceCandidate).toHaveBeenCalledTimes(1));
    act(() => socketHarness.sockets[0].trigger("rw:signal", { type: "ice", payload: { candidate: "candidate-second" } }));
    await waitFor(() => expect((peers[0] as FakePeerConnection).addIceCandidate).toHaveBeenCalledTimes(2));
    releaseQueuedCandidate?.();
    await waitFor(() => expect(socketHarness.sockets[0].emit).toHaveBeenCalledWith("rw:signal", {
      type: "answer", payload: { type: "answer", sdp: "viewer-answer" }
    }));
    expect(audioTransceiver.direction).toBe("sendrecv");
    fireEvent.playing(screen.getByLabelText("Live room video"));
    expect(screen.getByRole("region", { name: "Room audio" })).toBeTruthy();
    expect(screen.getByText("Listen to room audio, hold to talk back, or play an alarm.")).toBeTruthy();
    const talkButton = screen.getByRole("button", { name: "Hold to Talk" });
    expect(talkButton.hasAttribute("disabled")).toBe(true);
    expect(getUserMedia).not.toHaveBeenCalled();

    act(() => socketHarness.sockets[0].trigger("rw:speaker-status", { ready: true }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Hold to Talk" }).hasAttribute("disabled")).toBe(false));
    expect(getUserMedia).not.toHaveBeenCalled();

    const readyButton = screen.getByRole("button", { name: "Hold to Talk" });
    fireEvent.pointerDown(readyButton, { pointerId: 7 });
    expect(await screen.findByRole("button", { name: "Talking — release to stop" })).toBeTruthy();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(sender.replaceTrack).toHaveBeenCalledWith(microphoneTrack);
    expect(socketHarness.sockets[0].emit.mock.calls.filter(([event, value]) => event === "rw:signal" && value?.type === "offer")).toHaveLength(0);
    expect(socketHarness.sockets[0].emit).toHaveBeenCalledWith("rw:talk-status", { talking: true });

    fireEvent.pointerUp(readyButton, { pointerId: 7 });
    await waitFor(() => expect(microphoneTrack.stop).toHaveBeenCalledOnce());
    expect(sender.replaceTrack).toHaveBeenLastCalledWith(null);
    expect(socketHarness.sockets[0].emit).toHaveBeenLastCalledWith("rw:talk-status", { talking: false });

    fireEvent.pointerDown(readyButton, { pointerId: 8 });
    expect((await screen.findByRole("alert")).textContent).toContain("Microphone access failed.");
    fireEvent.pointerUp(readyButton, { pointerId: 8 });

    fireEvent.pointerDown(readyButton, { pointerId: 9 });
    expect(await screen.findByRole("button", { name: "Talking — release to stop" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop Viewing" }));
    await waitFor(() => expect(stopViewTrack.stop).toHaveBeenCalledOnce());
    expect(screen.getByRole("heading", { name: "How would you like to use RW?" })).toBeTruthy();
  });
});

describe("T21 viewer stop lifecycle", () => {
  it("shows Monitoring ended and closes the viewer socket when camera monitoring stops", async () => {
    const peers: Array<{ close: ReturnType<typeof vi.fn> }> = [];
    class FakePeerConnection {
      connectionState = "new";
      ontrack: ((event: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      onicecandidate: (() => void) | null = null;
      close = vi.fn();
      constructor() { peers.push(this); }
      getTransceivers() { return []; }
      getStats = vi.fn(async () => new Map());
    }
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/viewer-session") return jsonResponse({ status: "paired" });
      if (url === "/api/viewer-session/connection") return jsonResponse({ sessionId: "s".repeat(43), iceServers: [] });
      return new Response(null, { status: 404 });
    }));
    window.history.replaceState({}, "", "/viewer");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Viewer paired" })).toBeTruthy();
    await waitFor(() => expect(socketHarness.sockets).toHaveLength(1));
    await waitFor(() => expect(peers).toHaveLength(1));
    const viewerSocket = socketHarness.sockets[0];
    act(() => viewerSocket.trigger("rw:session-ended"));

    expect(screen.getAllByText("Monitoring ended")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Stop Viewing" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry connection" })).toBeNull();
    expect(viewerSocket.disconnect).toHaveBeenCalledOnce();
    expect(peers[0].close).toHaveBeenCalledOnce();
  });
});

describe("T22 connection startup", () => {
  it("warms authorized camera ICE configuration before a viewer pairs", async () => {
    const { stream } = makeStream();
    vi.stubGlobal("RTCPeerConnection", class {});
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    const payload = sessionPayload();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      if (url.startsWith("/api/turn-credentials/")) return jsonResponse({ iceServers: [{ urls: "stun:stun.example.test" }] });
      return jsonResponse(payload, 201);
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    await screen.findByRole("img", { name: "Viewer pairing QR code" });
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).startsWith("/api/turn-credentials/"))).toBe(true));

    const iceRequest = fetchMock.mock.calls.find(([input]) => String(input).startsWith("/api/turn-credentials/"));
    expect(iceRequest?.[1]?.headers).toEqual({ Authorization: `Bearer ${payload.cameraToken}` });
    expect(socketHarness.sockets[0].handlers.has("rw:peer-joined")).toBe(true);
  });

  it("shows a disconnected state and retry action when the camera connection drops", async () => {
    class FakePeerConnection {
      connectionState = "new";
      ontrack: ((event: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      onicecandidate: (() => void) | null = null;
      close = vi.fn();
      getTransceivers() { return []; }
      getStats = vi.fn(async () => new Map());
    }
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/viewer-session") return jsonResponse({ status: "paired" });
      if (String(input) === "/api/viewer-session/connection") return jsonResponse({ sessionId: "s".repeat(43), iceServers: [] });
      return new Response(null, { status: 404 });
    }));
    window.history.replaceState({}, "", "/viewer");
    render(<App />);

    await screen.findByRole("heading", { name: "Viewer paired" });
    await waitFor(() => expect(socketHarness.sockets).toHaveLength(1));
    act(() => socketHarness.sockets[0].trigger("rw:peer-left", { role: "camera" }));

    expect(screen.getByText("Connection unavailable. Retry to reconnect without pairing again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry connection" })).toBeTruthy();
  });

  it("shows a specific 20-second startup timeout and offers retry without pairing again", async () => {
    const startupTimeouts: Array<() => void> = [];
    const originalSetTimeout = window.setTimeout;
    vi.spyOn(window, "setTimeout").mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 20_000 && typeof handler === "function") {
        startupTimeouts.push(() => (handler as () => void)());
        return 2_147_483_647;
      }
      return originalSetTimeout.call(window, handler as () => void, timeout);
    }) as typeof window.setTimeout);
    class FakePeerConnection {
      connectionState = "new";
      ontrack: ((event: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      onicecandidate: (() => void) | null = null;
      close = vi.fn();
      constructor() { peers.push(this); }
      getTransceivers() { return []; }
      getStats = vi.fn(async () => new Map());
    }
    const peers: FakePeerConnection[] = [];
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/viewer-session") return jsonResponse({ status: "paired" });
      if (url === "/api/viewer-session/connection") return jsonResponse({ sessionId: "s".repeat(43), iceServers: [] });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/viewer");
    render(<App />);

    await screen.findByRole("heading", { name: "Viewer paired" });
    await waitFor(() => expect(startupTimeouts).toHaveLength(1));
    expect(await screen.findByText("Cross-network relay is unavailable. Check the service's TURN settings, then retry.")).toBeTruthy();
    act(() => startupTimeouts[0]());

    expect(screen.getByText("Video did not start within 20 seconds. Check the connection, then retry.")).toBeTruthy();
    const retryButton = screen.getByRole("button", { name: "Retry connection" });
    expect(retryButton).toBeTruthy();
    fireEvent.click(retryButton);
    await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => String(input) === "/api/viewer-session/connection")).toHaveLength(2));
    expect(screen.getByRole("heading", { name: "Viewer paired" })).toBeTruthy();
    expect(peers[0].close).toHaveBeenCalledOnce();
  });
});

describe("T18 viewer sound alarm", () => {
  it("reports alarm playback only after camera acknowledgement and lets the viewer stop it", async () => {
    class FakePeerConnection {
      connectionState = "new";
      ontrack: ((event: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      onicecandidate: (() => void) | null = null;
      getTransceivers() { return []; }
      getStats = vi.fn(async () => new Map());
      close = vi.fn();
    }
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    const getUserMedia = vi.fn();
    installMediaDevices(getUserMedia);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/viewer-session") return jsonResponse({ status: "paired" });
      if (url === "/api/viewer-session/connection") return jsonResponse({ sessionId: "s".repeat(43), iceServers: [] });
      return new Response(null, { status: 404 });
    }));
    window.history.replaceState({}, "", "/viewer");
    render(<App />);

    await screen.findByText("Viewer paired");
    await waitFor(() => expect(socketHarness.sockets).toHaveLength(1));
    fireEvent.playing(screen.getByLabelText("Live room video"));
    act(() => socketHarness.sockets[0].trigger("rw:speaker-status", { ready: true }));
    const alarmButton = screen.getByRole("button", { name: "Sound Alarm" });
    await waitFor(() => expect(alarmButton.hasAttribute("disabled")).toBe(false));
    expect(getUserMedia).not.toHaveBeenCalled();

    fireEvent.click(alarmButton);
    const firstAlarm = socketHarness.sockets[0].emit.mock.calls.find(([event]) => event === "rw:alarm");
    const requestId = (firstAlarm?.[1] as { requestId?: unknown } | undefined)?.requestId;
    expect(typeof requestId).toBe("string");
    expect(String(requestId)).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(alarmButton.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Alarm playing")).toBeNull();

    act(() => socketHarness.sockets[0].trigger("rw:alarm-result", { requestId, status: "started" }));
    expect(await screen.findByText("Alarm playing")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop alarm" }));
    expect(socketHarness.sockets[0].emit).toHaveBeenLastCalledWith("rw:alarm-stop", { requestId });
    act(() => socketHarness.sockets[0].trigger("rw:alarm-result", { requestId, status: "ended" }));
    expect(await screen.findByText("Alarm finished")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sound Alarm" }));
    const secondAlarm = socketHarness.sockets[0].emit.mock.calls.filter(([event]) => event === "rw:alarm")[1];
    const secondRequestId = (secondAlarm?.[1] as { requestId?: unknown } | undefined)?.requestId;
    act(() => socketHarness.sockets[0].trigger("rw:alarm-result", { requestId: secondRequestId, status: "failed" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Alarm failed.");
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
    expect(screen.getByRole("region", { name: "Audio controls" })).toBeTruthy();
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

  it("hides the QR and PIN after the viewer connects and keeps them hidden after a disconnect", async () => {
    const { stream } = makeStream();
    vi.stubGlobal("RTCPeerConnection", class {});
    installMediaDevices(vi.fn().mockResolvedValue(stream));
    const payload = sessionPayload();
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(payload, 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    expect(await screen.findByRole("img", { name: "Viewer pairing QR code" })).toBeTruthy();
    const cameraSocket = socketHarness.sockets[0];
    act(() => cameraSocket.trigger("connect"));
    act(() => cameraSocket.trigger("rw:viewer-paired"));
    expect(screen.queryByRole("img", { name: "Viewer pairing QR code" })).toBeNull();
    expect(screen.getByText("The viewer is connecting or can reconnect without scanning again.")).toBeTruthy();
    act(() => cameraSocket.trigger("rw:viewer-count", { count: 1 }));

    expect(await screen.findByRole("heading", { name: "Viewer paired" })).toBeTruthy();
    expect(screen.getByText("Viewer connected")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Viewer pairing QR code" })).toBeNull();
    expect(screen.queryByLabelText("Pairing PIN 123456")).toBeNull();

    act(() => cameraSocket.trigger("rw:viewer-count", { count: 0 }));
    expect(screen.getByText("The viewer is connecting or can reconnect without scanning again.")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Viewer pairing QR code" })).toBeNull();
    act(() => cameraSocket.trigger("disconnect"));
    expect(screen.getByText("Monitoring Interrupted")).toBeTruthy();
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

describe("T20 camera monitoring status", () => {
  it("shows Monitoring Interrupted when the active camera track ends", async () => {
    const media = makeStream();
    vi.stubGlobal("RTCPeerConnection", class {});
    installMediaDevices(vi.fn().mockResolvedValue(media.stream));
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse(sessionPayload(), 201);
    }));
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create pairing code" }));
    const onEnded = media.videoTrack.addEventListener.mock.calls.find(([event]) => event === "ended")?.[1];
    expect(typeof onEnded).toBe("function");
    act(() => (onEnded as () => void)());

    expect(screen.getByText("Monitoring Interrupted")).toBeTruthy();
    expect(screen.queryByText("Monitoring Active")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("T08/T10 viewer pairing and re-entry UI", () => {
  it("scans a same-site pairing QR and then asks for the separate PIN", async () => {
    window.history.replaceState({}, "", "/viewer");
    const controls = { stop: vi.fn() };
    const decodeSpy = vi.spyOn(BrowserMultiFormatReader.prototype, "decodeFromConstraints").mockImplementation(async (_constraints, _video, callback) => {
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
    expect(document.querySelector(".viewer-live-shell")).toBeTruthy();
    expect(document.querySelector(".viewer-live-surface")).toBeTruthy();
    expect(document.querySelector(".viewer-live-layout")).toBeTruthy();
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
