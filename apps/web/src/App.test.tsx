import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("RW role-selection screens", () => {
  it("shows clear camera and viewer choices on the home screen", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "How would you like to use RW?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /use as camera/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /use as viewer/i })).toBeTruthy();
    expect(screen.getByText("RW does not save video or audio.")).toBeTruthy();
  });

  it("opens the camera setup screen without requesting camera access", () => {
    const getUserMedia = navigator.mediaDevices?.getUserMedia;
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /use as camera/i }));

    expect(window.location.pathname).toBe("/camera");
    expect(screen.getByRole("heading", { name: "Set up this room camera" })).toBeTruthy();
    expect(screen.getByText("Not monitoring")).toBeTruthy();
    expect(screen.getByText(/Camera access has not started/)).toBeTruthy();
    expect(navigator.mediaDevices?.getUserMedia).toBe(getUserMedia);
  });

  it("opens the viewer pairing screen", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /use as viewer/i }));

    expect(window.location.pathname).toBe("/viewer");
    expect(screen.getByRole("heading", { name: "Watch a paired room" })).toBeTruthy();
    expect(screen.getByText("Waiting to pair")).toBeTruthy();
    expect(screen.getByText("Scan the QR code on the camera device.")).toBeTruthy();
  });

  it("renders a camera route opened directly and returns to the home screen", () => {
    window.history.replaceState({}, "", "/camera");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Set up this room camera" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /back to roles/i }));
    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("heading", { name: "How would you like to use RW?" })).toBeTruthy();
  });
});
