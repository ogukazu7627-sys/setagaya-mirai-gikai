"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { BudgetMapMode } from "../../../shared/utils/budget-map-layout";
import {
  BUDGET_MAP_TUTORIAL_STEPS,
  type BudgetMapTutorialStep,
  getBudgetMapTutorialCaretDirection,
  getBudgetMapTutorialMaskImage,
  isBudgetMapTutorialLastStep,
} from "../../../shared/utils/budget-map-tutorial";
import type { BudgetMapV2Style } from "./budget-map-v2-layers";

/**
 * 触れる予算の使い方。
 *
 * dim・リング・カードは world の内側に入れず viewport 直下の兄弟として置く。
 * 開いている間はマップのノードを操作させない。
 */

type BudgetMapV2TutorialProps = {
  step: BudgetMapTutorialStep;
  mode: BudgetMapMode;
  /** 航行中はカードとdimを退避してワープ演出を隠さない。 */
  held: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClosed: () => void;
};

export function BudgetMapV2Tutorial({
  step,
  mode,
  held,
  onNext,
  onPrevious,
  onSkip,
  onClosed,
}: BudgetMapV2TutorialProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const spotlight = step.spotlight[mode];
  const cardPosition = step.cardPosition[mode];
  const isLastStep = isBudgetMapTutorialLastStep(step.index);

  // 開いたら「次へ」へフォーカスを移す。
  useEffect(() => {
    if (!held) {
      nextRef.current?.focus();
    }
  }, [held]);

  // Esc はスキップと同じ扱い。カード内は Tab がループする。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onSkip();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!(first && last)) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);

  // 閉じたら「使い方」ボタンへフォーカスを戻す。
  useEffect(() => onClosed, [onClosed]);

  if (held) {
    return null;
  }

  const maskImage = getBudgetMapTutorialMaskImage(spotlight);

  return (
    <>
      <div
        aria-hidden="true"
        className="budget-map-v2-tutorial-dim"
        style={{ "--budget-tut-mask": maskImage } as BudgetMapV2Style}
      />
      <div
        aria-hidden="true"
        className="budget-map-v2-tutorial-ring"
        style={
          {
            "--budget-tut-x": `${spotlight.xPercent}%`,
            "--budget-tut-y": `${spotlight.yPercent}%`,
            "--budget-tut-w": `${spotlight.radiusXPx * 2}px`,
            "--budget-tut-h": `${spotlight.radiusYPx * 2}px`,
            "--budget-tut-mx": `${-spotlight.radiusXPx}px`,
            "--budget-tut-my": `${-spotlight.radiusYPx}px`,
          } as BudgetMapV2Style
        }
      />
      <div className="budget-map-v2-tutorial-slot" data-position={cardPosition}>
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label="触れる予算の使い方"
          className="budget-map-v2-tutorial-card"
        >
          <span
            aria-hidden="true"
            className="budget-map-v2-tutorial-caret"
            data-direction={getBudgetMapTutorialCaretDirection(cardPosition)}
          />
          <p className="budget-map-v2-tutorial-title">{step.title}</p>
          <BudgetMapV2TutorialFigure stepIndex={step.index} />
          <p className="budget-map-v2-tutorial-body">{step.body}</p>
          <div className="flex items-center justify-between gap-3">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              {BUDGET_MAP_TUTORIAL_STEPS.map((candidate) => (
                <span
                  key={candidate.index}
                  className="budget-map-v2-tutorial-dot"
                  data-current={candidate.index === step.index}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="min-h-11 rounded-md text-budget-space-copy hover:bg-budget-space-mid hover:text-white"
              >
                スキップ
              </Button>
              {step.index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onPrevious}
                  className="min-h-11 rounded-md text-budget-space-copy hover:bg-budget-space-mid hover:text-white sm:inline-flex"
                >
                  戻る
                </Button>
              )}
              <Button
                ref={nextRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={onNext}
                className="min-h-11 rounded-md border-budget-space-line bg-white/95 font-bold text-mirai-text hover:bg-white"
              >
                {isLastStep ? "はじめる" : "次へ"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** ステップ別のミニアニメーション。CSS animation だけで作る。 */
function BudgetMapV2TutorialFigure({ stepIndex }: { stepIndex: number }) {
  if (stepIndex === 0) {
    return (
      <div aria-hidden="true" className="budget-map-v2-tutorial-figure">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className="budget-map-v2-tutorial-chip"
            data-highlight={index === 1}
          >
            {index === 1 && <span className="budget-map-v2-tutorial-tap" />}
          </span>
        ))}
      </div>
    );
  }

  if (stepIndex === 1) {
    return (
      <div aria-hidden="true" className="budget-map-v2-tutorial-figure">
        <span className="budget-map-v2-tutorial-core" />
        <span className="budget-map-v2-tutorial-link" />
        <span className="flex flex-col gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="budget-map-v2-tutorial-bar"
              data-highlight={index === 1}
            />
          ))}
        </span>
      </div>
    );
  }

  if (stepIndex === 2) {
    // 丸の大きさは、この画面内での金額の相対的な大小を表す。
    const sizes = [30, 22, 16, 12];
    return (
      <div aria-hidden="true" className="budget-map-v2-tutorial-figure">
        {sizes.map((size, index) => (
          <span
            key={size}
            className="budget-map-v2-tutorial-disc"
            style={
              {
                width: `${size}px`,
                height: `${size}px`,
                "--budget-tut-delay": `${index * 110}ms`,
              } as BudgetMapV2Style
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="budget-map-v2-tutorial-figure flex-col">
      <span className="budget-map-v2-tutorial-search">
        <span className="budget-map-v2-tutorial-caretbar" />
      </span>
      {[0, 1].map((index) => (
        <span
          key={index}
          className="budget-map-v2-tutorial-row"
          style={
            {
              width: index === 0 ? "150px" : "116px",
              "--budget-tut-delay": `${index * 160}ms`,
            } as BudgetMapV2Style
          }
        />
      ))}
    </div>
  );
}
