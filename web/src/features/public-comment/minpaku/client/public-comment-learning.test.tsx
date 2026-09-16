// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MINPAKU_LESSONS } from "../shared/learning";
import { PublicCommentLearning } from "./public-comment-learning";

describe("PublicCommentLearningの章移動", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "focus");
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function expectChapterStart(chapter: number) {
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: MINPAKU_LESSONS[chapter].title,
      })
    ).toHaveFocus();
    expect(HTMLElement.prototype.focus).toHaveBeenLastCalledWith({
      preventScroll: true,
    });
  }

  function answerChapter(chapter: number) {
    const lesson = MINPAKU_LESSONS[chapter];
    fireEvent.click(
      screen.getByRole("radio", {
        name: lesson.quiz.options[lesson.quiz.correctIndex],
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "回答を確認" }));
  }

  it("初期表示と前後の章移動では先頭へ移動し、回答と解説は維持する", () => {
    render(
      <PublicCommentLearning onStartInterview={vi.fn()} onBack={vi.fn()} />
    );
    expectChapterStart(0);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    answerChapter(0);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "正解です" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "次の章へ" }));
    expectChapterStart(1);
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
    answerChapter(1);

    fireEvent.click(screen.getByRole("button", { name: "前の章へ" }));
    expectChapterStart(0);
    expect(window.scrollTo).toHaveBeenCalledTimes(3);
    expect(
      screen.getByRole("radio", {
        name: MINPAKU_LESSONS[0].quiz.options[
          MINPAKU_LESSONS[0].quiz.correctIndex
        ],
      })
    ).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(
      MINPAKU_LESSONS[0].quiz.explanation
    );

    fireEvent.click(screen.getByRole("button", { name: "次の章へ" }));
    expectChapterStart(1);
    expect(window.scrollTo).toHaveBeenCalledTimes(4);
    expect(
      screen.getByRole("radio", {
        name: MINPAKU_LESSONS[1].quiz.options[
          MINPAKU_LESSONS[1].quiz.correctIndex
        ],
      })
    ).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(
      MINPAKU_LESSONS[1].quiz.explanation
    );
  });

  it("同じ章の再レンダーや同意画面への操作では先頭移動や見出しフォーカスを繰り返さない", () => {
    const onStartInterview = vi.fn();
    const { rerender } = render(
      <PublicCommentLearning
        onStartInterview={onStartInterview}
        onBack={vi.fn()}
      />
    );
    answerChapter(0);
    vi.mocked(window.scrollTo).mockClear();
    vi.mocked(HTMLElement.prototype.focus).mockClear();
    const startButton = screen.getByRole("button", {
      name: "学習を途中で終えてインタビューへ",
    });
    startButton.focus();
    fireEvent.click(startButton);
    expect(onStartInterview).toHaveBeenCalledTimes(1);
    vi.mocked(HTMLElement.prototype.focus).mockClear();
    rerender(
      <PublicCommentLearning
        onStartInterview={onStartInterview}
        onBack={vi.fn()}
      />
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.focus).not.toHaveBeenCalled();
    expect(startButton).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      MINPAKU_LESSONS[0].quiz.explanation
    );
  });
});
