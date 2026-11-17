import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
