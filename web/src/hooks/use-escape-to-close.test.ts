// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEscapeToClose } from "./use-escape-to-close";

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

describe("useEscapeToClose", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("closes on Escape even when focus is outside the modal", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(true, onClose));

    pressEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape while closed", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(false, onClose));

    pressEscape();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores other keys", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(true, onClose));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops listening after unmount", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(true, onClose));

    unmount();
    pressEscape();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("moves focus to the container when it opens", () => {
    const container = document.createElement("div");
    container.tabIndex = -1;
    document.body.appendChild(container);

    renderHook(() => useEscapeToClose(true, vi.fn(), { current: container }));

    expect(document.activeElement).toBe(container);
  });
});
