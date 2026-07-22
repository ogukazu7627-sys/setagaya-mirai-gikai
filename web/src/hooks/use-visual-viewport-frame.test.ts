// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisualViewportFrame } from "./use-visual-viewport-frame";

type MockVisualViewport = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

describe("useVisualViewportFrame", () => {
  const originalVisualViewport = window.visualViewport;
  const originalInnerHeight = window.innerHeight;
  const originalInnerWidth = window.innerWidth;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  let frameCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    frameCallback = null;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 1;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: originalVisualViewport,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: originalCancelAnimationFrame,
    });
  });

  it("visualViewportの高さ・オフセット・キーボード差分を返す", () => {
    const viewport: MockVisualViewport = {
      width: 390,
      height: 500,
      offsetTop: 20,
      offsetLeft: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    const { result } = renderHook(() => useVisualViewportFrame());

    expect(result.current).toEqual({
      width: 390,
      height: 500,
      offsetTop: 20,
      offsetLeft: 0,
      keyboardInset: 280,
    });
  });

  it("resize/scrollイベントでrequestAnimationFrameにまとめて更新する", () => {
    let resizeHandler: (() => void) | undefined;
    const viewport: MockVisualViewport = {
      width: 390,
      height: 700,
      offsetTop: 0,
      offsetLeft: 0,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === "resize") {
          resizeHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    const { result } = renderHook(() => useVisualViewportFrame());
    expect(result.current.height).toBe(700);

    act(() => {
      viewport.height = 480;
      resizeHandler?.();
      frameCallback?.(0);
    });

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(result.current.height).toBe(480);
  });

  it("visualViewportがない環境ではwindow.innerHeightへフォールバックする", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: null,
    });

    const { result } = renderHook(() => useVisualViewportFrame());

    expect(result.current).toEqual({
      width: 390,
      height: 800,
      offsetTop: 0,
      offsetLeft: 0,
      keyboardInset: 0,
    });
  });
});
