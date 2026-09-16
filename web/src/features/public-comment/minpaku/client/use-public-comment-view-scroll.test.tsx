// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePublicCommentViewScroll } from "./use-public-comment-view-scroll";

function View({
  view,
  modalOpen = false,
  message = "最初の質問",
}: {
  view: string;
  modalOpen?: boolean;
  message?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  usePublicCommentViewScroll(view, containerRef);

  return (
    <>
      <div ref={containerRef}>
        {view === "interview" ? (
          <>
            <p>{message}</p>
            <textarea aria-label="回答" />
          </>
        ) : (
          <h1>{view}</h1>
        )}
      </div>
      {modalOpen && <div role="dialog" aria-label="同意確認" />}
    </>
  );
}

describe("usePublicCommentViewScroll", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "focus");
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("viewが変わるたびに見出しをフォーカスしてから先頭へ即時移動する", () => {
    const { rerender } = render(<View view="intro" />);
    for (const view of ["intro", "ordinances", "review", "complete", "intro"]) {
      rerender(<View view={view} />);
      const heading = screen.getByRole("heading", { level: 1, name: view });
      expect(heading).toHaveAttribute("tabindex", "-1");
      expect(heading).toHaveFocus();
      expect(HTMLElement.prototype.focus).toHaveBeenLastCalledWith({
        preventScroll: true,
      });
      expect(window.scrollTo).toHaveBeenLastCalledWith({
        top: 0,
        left: 0,
        behavior: "instant",
      });
      expect(
        vi.mocked(HTMLElement.prototype.focus).mock.invocationCallOrder.at(-1)
      ).toBeLessThan(
        vi.mocked(window.scrollTo).mock.invocationCallOrder.at(-1) ?? 0
      );
    }
    expect(window.scrollTo).toHaveBeenCalledTimes(5);
  });

  it("learningは章コンポーネントに任せ、画面側の処理を重ねない", () => {
    const { rerender } = render(<View view="intro" />);
    vi.clearAllMocks();
    rerender(<View view="learning" />);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.focus).not.toHaveBeenCalled();
  });

  it("モーダル開閉や同じviewの再レンダーではスクロールやフォーカスを変えない", () => {
    const { rerender } = render(<View view="review" />);
    vi.clearAllMocks();
    rerender(<View view="review" modalOpen />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    rerender(<View view="review" />);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.focus).not.toHaveBeenCalled();
  });

  it("インタビュー進入時だけwindowを先頭に戻し、新着では入力フォーカスを奪わない", () => {
    const { rerender } = render(<View view="intro" />);
    vi.clearAllMocks();
    rerender(<View view="interview" />);
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    expect(HTMLElement.prototype.focus).not.toHaveBeenCalled();
    const input = screen.getByRole("textbox");
    input.focus();
    vi.clearAllMocks();
    rerender(<View view="interview" message="次の質問" />);
    expect(input).toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.focus).not.toHaveBeenCalled();
  });
});
