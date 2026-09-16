// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { PublicCommentChatScroll } from "./public-comment-chat-scroll";

const scrollToBottom = vi.hoisted(() => vi.fn());
const scrollRef = { current: document.createElement("div") };
let onResize: ResizeObserverCallback;
const disconnect = vi.fn();
vi.mock("use-stick-to-bottom", () => ({
  useStickToBottomContext: () => ({ scrollToBottom, scrollRef }),
}));
vi.mock("@/components/ai-elements/conversation", () => ({
  ConversationScrollButton: (props: React.ComponentProps<"button">) => (
    <Button type="button" {...props} />
  ),
}));
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        onResize = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("民泊チャットの最新会話への移動", () => {
  it("入力開始時だけ末尾に戻り、入力中の再描画では履歴閲覧を妨げない", () => {
    const { rerender } = render(<PublicCommentChatScroll focused={false} />);
    expect(scrollToBottom).not.toHaveBeenCalled();
    rerender(<PublicCommentChatScroll focused />);
    expect(scrollToBottom).toHaveBeenCalledWith({ animation: "instant" });
    rerender(<PublicCommentChatScroll focused />);
    expect(scrollToBottom).toHaveBeenCalledTimes(1);
    rerender(<PublicCommentChatScroll focused={false} />);
    expect(scrollToBottom).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "最新の会話へ移動" })
    ).toBeInTheDocument();
  });

  it("キーボード・候補・複数行入力による高さ変更では履歴位置を尊重して追従する", () => {
    const { unmount } = render(<PublicCommentChatScroll focused={false} />);
    onResize([], {} as ResizeObserver);
    expect(scrollToBottom).toHaveBeenCalledWith({
      animation: "instant",
      preserveScrollPosition: true,
    });
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
