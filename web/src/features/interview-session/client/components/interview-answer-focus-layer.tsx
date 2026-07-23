"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { VisualViewportFrame } from "@/hooks/use-visual-viewport-frame";
import { InterviewProgressBar } from "./interview-progress-bar";
import { InterviewTimer } from "./interview-timer";

interface InterviewAnswerFocusLayerProps {
  children: ReactNode;
  currentTopic: string | null;
  frame: VisualViewportFrame;
  isQuestionLoading: boolean;
  latestQuestion: string;
  progressPercentage: number | null;
  remainingMinutes: number | null;
  restoreScrollY: number;
}

export function InterviewAnswerFocusLayer({
  children,
  currentTopic,
  frame,
  isQuestionLoading,
  latestQuestion,
  progressPercentage,
  remainingMinutes,
  restoreScrollY,
}: InterviewAnswerFocusLayerProps) {
  useLayoutEffect(() => {
    const { style: bodyStyle } = document.body;
    const { style: htmlStyle } = document.documentElement;
    const previousBody = {
      left: bodyStyle.left,
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      right: bodyStyle.right,
      top: bodyStyle.top,
      width: bodyStyle.width,
    };
    const previousHtml = {
      overflow: htmlStyle.overflow,
      overscrollBehavior: htmlStyle.overscrollBehavior,
    };

    bodyStyle.position = "fixed";
    bodyStyle.top = `-${restoreScrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";
    htmlStyle.overflow = "hidden";
    htmlStyle.overscrollBehavior = "none";

    return () => {
      bodyStyle.position = previousBody.position;
      bodyStyle.top = previousBody.top;
      bodyStyle.left = previousBody.left;
      bodyStyle.right = previousBody.right;
      bodyStyle.width = previousBody.width;
      bodyStyle.overflow = previousBody.overflow;
      htmlStyle.overflow = previousHtml.overflow;
      htmlStyle.overscrollBehavior = previousHtml.overscrollBehavior;
      window.scrollTo(0, restoreScrollY);
    };
  }, [restoreScrollY]);

  if (typeof document === "undefined") {
    return null;
  }

  const questionMaxHeight = Math.max(72, Math.floor(frame.height * 0.36));

  return createPortal(
    <div
      aria-label="AIインタビュー回答入力"
      aria-modal="true"
      className="fixed z-[100] flex flex-col overflow-hidden bg-white"
      data-testid="interview-answer-focus-layer"
      role="dialog"
      style={{
        height: `${frame.height}px`,
        left: `${frame.offsetLeft}px`,
        top: `${frame.offsetTop}px`,
        width: `${frame.width}px`,
      }}
    >
      <div className="shrink-0 px-4 pb-2 pt-3">
        {progressPercentage !== null ? (
          <InterviewProgressBar
            percentage={progressPercentage}
            currentTopic={currentTopic}
            remainingMinutes={remainingMinutes}
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-bold text-mirai-text">
              {currentTopic ?? "AIインタビュー"}
            </p>
            {remainingMinutes !== null && (
              <InterviewTimer remainingMinutes={remainingMinutes} />
            )}
          </div>
        )}
      </div>

      <div className="min-h-3 flex-1" aria-hidden="true" />

      <div
        className="mx-4 mb-[10px] flex shrink-0 flex-col gap-3"
        data-testid="interview-answer-dock"
      >
        <section
          aria-busy={isQuestionLoading}
          aria-labelledby="interview-current-question-heading"
          className="min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-mirai-border bg-mirai-surface-light p-4"
          data-testid="interview-latest-question"
          style={{ maxHeight: `${questionMaxHeight}px` }}
        >
          <h2
            className="mb-2 text-sm font-bold text-primary"
            id="interview-current-question-heading"
          >
            現在の質問
          </h2>
          <p
            aria-live="polite"
            className="whitespace-pre-wrap text-base font-medium leading-relaxed text-mirai-text"
          >
            {latestQuestion}
          </p>
        </section>
        {children}
      </div>
    </div>,
    document.body
  );
}
