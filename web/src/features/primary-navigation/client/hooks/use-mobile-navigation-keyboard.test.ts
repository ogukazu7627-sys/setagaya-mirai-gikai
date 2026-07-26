// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isTextEntryElement,
  useMobileNavigationKeyboard,
} from "./use-mobile-navigation-keyboard";

const visualViewportFrameMock = vi.hoisted(() => ({
  frame: {
    height: 800,
    keyboardInset: 0,
    offsetLeft: 0,
    offsetTop: 0,
    width: 390,
  },
}));

vi.mock("@/hooks/use-visual-viewport-frame", () => ({
  useVisualViewportFrame: () => visualViewportFrameMock.frame,
}));

beforeEach(() => {
  document.body.innerHTML = "";
  visualViewportFrameMock.frame = {
    height: 800,
    keyboardInset: 0,
    offsetLeft: 0,
    offsetTop: 0,
    width: 390,
  };
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
});

describe("isTextEntryElement", () => {
  it("recognizes controls that open a text keyboard", () => {
    const textInput = document.createElement("input");
    textInput.type = "search";
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.contentEditable = "true";

    expect(isTextEntryElement(textInput)).toBe(true);
    expect(isTextEntryElement(textarea)).toBe(true);
    expect(isTextEntryElement(editable)).toBe(true);
  });

  it("does not treat non-text controls as a software keyboard", () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    expect(isTextEntryElement(checkbox)).toBe(false);
    expect(isTextEntryElement(document.createElement("button"))).toBe(false);
    expect(isTextEntryElement(null)).toBe(false);
  });
});

describe("useMobileNavigationKeyboard", () => {
  it("hides the mobile navigation while a text input has focus", () => {
    const input = document.createElement("input");
    const button = document.createElement("button");
    document.body.append(input, button);
    const { result } = renderHook(() => useMobileNavigationKeyboard());

    act(() => {
      input.focus();
    });
    expect(result.current).toBe(true);

    act(() => {
      button.focus();
    });
    expect(result.current).toBe(false);
  });

  it("does not hide the desktop navigation at the 1000px boundary", () => {
    visualViewportFrameMock.frame = {
      ...visualViewportFrameMock.frame,
      width: 1000,
    };
    const input = document.createElement("input");
    document.body.append(input);
    const { result } = renderHook(() => useMobileNavigationKeyboard());

    act(() => {
      input.focus();
    });

    expect(result.current).toBe(false);
  });

  it("still detects a software keyboard when the visual viewport is desktop-width", () => {
    visualViewportFrameMock.frame = {
      ...visualViewportFrameMock.frame,
      keyboardInset: 280,
      width: 1000,
    };
    const input = document.createElement("input");
    document.body.append(input);
    const { result } = renderHook(() => useMobileNavigationKeyboard());

    act(() => {
      input.focus();
    });

    expect(result.current).toBe(true);
  });

  it("updates when a focused input crosses the desktop breakpoint", () => {
    const input = document.createElement("input");
    document.body.append(input);
    const { result, rerender } = renderHook(() =>
      useMobileNavigationKeyboard()
    );

    act(() => {
      input.focus();
    });
    expect(result.current).toBe(true);

    visualViewportFrameMock.frame = {
      ...visualViewportFrameMock.frame,
      width: 1000,
    };
    rerender();

    expect(result.current).toBe(false);
  });
});
