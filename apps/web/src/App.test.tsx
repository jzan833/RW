import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("RW home page", () => {
  it("shows Camera Mode and Viewer Mode buttons", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Choose how this device will be used" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /camera mode/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /viewer mode/i })).toBeTruthy();
  });

  it("navigates to the camera placeholder without requesting camera access", () => {
    const getUserMedia = navigator.mediaDevices?.getUserMedia;
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /camera mode/i }));

    expect(window.location.pathname).toBe("/camera");
    expect(screen.getByRole("heading", { name: "Set this device up as the room camera." })).toBeTruthy();
    expect(navigator.mediaDevices?.getUserMedia).toBe(getUserMedia);
  });

  it("navigates to the viewer placeholder", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /viewer mode/i }));

    expect(window.location.pathname).toBe("/viewer");
    expect(screen.getByRole("heading", { name: "Use this device to view a paired room." })).toBeTruthy();
  });
});
