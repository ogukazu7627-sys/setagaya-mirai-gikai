"use client";

import { Progress } from "@/components/ui/progress";
import type { RemainingQuestionRange } from "../../shared/utils/calc-interview-progress";

interface InterviewProgressBarProps {
  percentage: number;
  currentTopic: string | null;
  remainingQuestionRange: RemainingQuestionRange | null;
}

export function InterviewProgressBar({
  percentage,
  currentTopic,
  remainingQuestionRange,
}: InterviewProgressBarProps) {
  const remainingQuestionLabel =
    remainingQuestionRange === null
      ? "質問終了"
      : remainingQuestionRange.min === remainingQuestionRange.max
        ? `あと約${remainingQuestionRange.min}問`
        : `あと約${remainingQuestionRange.min}〜${remainingQuestionRange.max}問`;

  return (
    <div className="rounded-[18px] bg-white">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {currentTopic && (
            <div className="inline-flex max-w-full rounded-lg bg-mirai-light-gradient px-4 py-0.5">
              <p className="min-w-0 truncate text-sm font-bold leading-[1.8] text-mirai-text">
                {currentTopic}
              </p>
            </div>
          )}
        </div>
        <p className="ml-auto shrink-0 text-sm text-mirai-text-muted">
          {remainingQuestionLabel}
        </p>
      </div>
      <Progress
        value={percentage}
        className="h-[7px] rounded-full bg-mirai-progress-track [&>[data-slot=progress-indicator]]:bg-primary"
      />
    </div>
  );
}
