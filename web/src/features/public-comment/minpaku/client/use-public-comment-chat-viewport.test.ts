// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePublicCommentChatViewport } from "./use-public-comment-chat-viewport";

const viewport = vi.hoisted(() => ({
  mobile: true,
  frame: {
    width: 390,
    height: 844,
    offsetTop: 0,
    offsetLeft: 0,
    keyboardInset: 0,
  },
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => viewport.mobile,
}));
vi.mock("@/hooks/use-visual-viewport-frame", () => ({
  useVisualViewportFrame: () => viewport.frame,
}));

describe("民泊チャットの可視領域", () => {
  beforeEach(() => {
    viewport.mobile = true;
    viewport.frame = {
      width: 390,
      height: 844,
      offsetTop: 0,
      offsetLeft: 0,
      keyboardInset: 0,
    };
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("style");
  });

  it("通常時は下部ナビの余白を確保し、フォーカス中は除外する", () => {
    const { result, rerender } = renderHook(
      ({ focused }) => usePublicCommentChatViewport(focused),
      { initialProps: { focused: false } }
    );
    expect(result.current.style?.height).toContain(
      "var(--mobile-primary-navigation-layout-offset)"
    );
    expect(result.current.style?.position).toBe("fixed");
    expect(document.body.style.position).toBe("fixed");
    rerender({ focused: true });
    expect(result.current.style?.height).not.toContain(
      "mobile-primary-navigation"
    );
  });

  it("キーボードの開閉・Safariのオフセット・横向きに追従する", () => {
    const { result, rerender } = renderHook(() =>
      usePublicCommentChatViewport(true)
    );
    act(() => {
      viewport.frame = {
        width: 390,
        height: 360,
        offsetTop: 52,
        offsetLeft: 0,
        keyboardInset: 432,
      };
    });
    rerender();
    expect(result.current.style?.height).toContain("360px");
    expect(result.current.isCompact).toBe(true);
    expect(result.current.style?.top).toBe(
      "calc(52px + var(--app-header-layout-offset))"
    );
    viewport.frame = {
      width: 844,
      height: 240,
      offsetTop: 0,
      offsetLeft: 12,
      keyboardInset: 150,
    };
    rerender();
    expect(result.current.style?.width).toBe(844);
    expect(result.current.style?.left).toBe(12);
    expect(result.current.style?.height).toContain("240px");
    expect(result.current.isCompact).toBe(true);
    viewport.frame = {
      width: 390,
      height: 844,
      offsetTop: 0,
      offsetLeft: 0,
      keyboardInset: 0,
    };
    rerender();
    expect(result.current.isCompact).toBe(false);
  });

  it("終了時に元のスタイルとページ位置を復元する", () => {
    document.body.style.overflow = "clip";
    document.body.style.top = "10px";
    document.body.style.width = "95%";
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.overscrollBehavior = "contain";
    vi.spyOn(window, "scrollY", "get").mockReturnValue(120);
    const { unmount } = renderHook(() => usePublicCommentChatViewport(false));
    expect(document.body.style.top).toBe("-120px");
    unmount();
    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("clip");
    expect(document.body.style.top).toBe("10px");
    expect(document.body.style.width).toBe("95%");
    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.documentElement.style.overscrollBehavior).toBe("contain");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 120);
  });

  it("PCではページを固定せず、モバイルからPCへ変わると解除する", () => {
    viewport.mobile = false;
    const { result, rerender } = renderHook(() =>
      usePublicCommentChatViewport(false)
    );
    expect(result.current.style).toBeUndefined();
    expect(document.body.style.position).toBe("");
    viewport.mobile = true;
    rerender();
    expect(document.body.style.position).toBe("fixed");
    viewport.mobile = false;
    rerender();
    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.body.style.width).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.documentElement.style.overscrollBehavior).toBe("");
    expect(result.current.style).toBeUndefined();
  });
});
