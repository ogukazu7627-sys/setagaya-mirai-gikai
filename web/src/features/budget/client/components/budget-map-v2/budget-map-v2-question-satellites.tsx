"use client";

import { MessageCircleQuestion } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type {
  BudgetMapMode,
  BudgetMapPosition,
} from "../../../shared/utils/budget-map-layout";
import {
  type BudgetMapQuestion,
  type BudgetMapQuestionOrbit,
  createBudgetMapQuestionOrbits,
} from "../../../shared/utils/budget-map-question-orbit";
import type { BudgetMapV2Style } from "./budget-map-v2-layers";

/**
 * 議員の質問衛星。
 *
 * 中心の予算コアの周りを、線でつながずに漂う顔写真として置く。
 * 質問は議員が議会で行ったものであり、当初予算の内訳・配分・執行を説明しない。
 * 衛星の数・位置・軌道にも意味はない。
 *
 * 質問が0件なら何も描かない。ダミーで埋めない。
 */

type BudgetMapV2QuestionSatellitesProps = {
  center: BudgetMapPosition;
  mode: BudgetMapMode;
  questions: readonly BudgetMapQuestion[];
  seed: number;
  openQuestionId: string | null;
  onOpenChange: (questionId: string | null) => void;
  onSelect: (question: BudgetMapQuestion) => void;
  disabled: boolean;
};

export function BudgetMapV2QuestionSatellites({
  center,
  mode,
  questions,
  seed,
  openQuestionId,
  onOpenChange,
  onSelect,
  disabled,
}: BudgetMapV2QuestionSatellitesProps) {
  // マウスとタッチで操作を分けるため、実際のポインタ種別を覚えておく。
  // hover メディアクエリでは、タッチ付きノートPCで取り違える。
  const isTouchRef = useRef(false);
  const orbits = createBudgetMapQuestionOrbits({
    center,
    questions,
    seed,
    mode,
  });

  if (orbits.length === 0) {
    return null;
  }

  return (
    <>
      {orbits.map((orbit) => (
        <BudgetMapV2QuestionSatellite
          key={orbit.id}
          disabled={disabled}
          isOpen={openQuestionId === orbit.question.questionId}
          isTouchRef={isTouchRef}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
          orbit={orbit}
        />
      ))}
    </>
  );
}

/**
 * 開閉で変わる見た目を CSS 変数で渡す。
 * 属性セレクタに頼らないのは、Tailwind の層構成では当たらないことがあるため。
 */
function getOpenStateVariables(
  isOpen: boolean,
  orbit: BudgetMapQuestionOrbit
): Record<string, string> {
  if (!isOpen) {
    return {
      "--budget-q-open-face-border": "rgb(253 230 138 / 0.7)",
      "--budget-q-open-face-shadow": "0 0 14px rgb(253 230 138 / 0.22)",
    };
  }
  return {
    "--budget-q-open-gap": `${orbit.gapPx}px`,
    "--budget-q-open-bg": "rgb(6 32 49 / 0.97)",
    "--budget-q-open-border": "rgb(253 230 138 / 0.85)",
    "--budget-q-open-shadow": "0 0 18px rgb(253 230 138 / 0.2)",
    "--budget-q-open-face-border": "rgb(253 230 138 / 0.9)",
    "--budget-q-open-face-shadow": "none",
    "--budget-q-open-body-max": "300px",
    "--budget-q-open-body-opacity": "1",
    "--budget-q-open-body-pad": `${orbit.bodyPaddingRightPx}px`,
  };
}

function BudgetMapV2QuestionSatellite({
  disabled,
  isOpen,
  isTouchRef,
  onOpenChange,
  onSelect,
  orbit,
}: {
  disabled: boolean;
  isOpen: boolean;
  isTouchRef: { current: boolean };
  onOpenChange: (questionId: string | null) => void;
  onSelect: (question: BudgetMapQuestion) => void;
  orbit: BudgetMapQuestionOrbit;
}) {
  const { question } = orbit;

  const handleClick = () => {
    if (disabled) {
      return;
    }
    // タッチは1回目で開き、2回目で遷移する。マウスは hover で開いて1クリック。
    if (isTouchRef.current && !isOpen) {
      onOpenChange(question.questionId);
      return;
    }
    onSelect(question);
  };

  return (
    <div
      className="budget-map-v2-question-orbit"
      data-open={isOpen}
      style={
        {
          "--budget-q-x": `${orbit.originX}px`,
          "--budget-q-y": `${orbit.originY}px`,
        } as BudgetMapV2Style
      }
    >
      <div
        className="budget-map-v2-question-ax"
        style={
          {
            "--budget-q-ax": `${orbit.amplitudeXPx}px`,
            "--budget-q-dur-x": `${orbit.durationXSeconds}s`,
            "--budget-q-delay": `${orbit.delaySeconds}s`,
          } as BudgetMapV2Style
        }
      >
        <div
          className="budget-map-v2-question-ay"
          style={
            {
              "--budget-q-ay": `${orbit.amplitudeYPx}px`,
              "--budget-q-dur-y": `${orbit.durationYSeconds}s`,
              "--budget-q-delay": `${orbit.delaySeconds}s`,
            } as BudgetMapV2Style
          }
        >
          <div
            className="budget-map-v2-question-bob"
            style={
              {
                "--budget-q-dur-bob": `${orbit.bobDurationSeconds}s`,
              } as BudgetMapV2Style
            }
          >
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={handleClick}
              onPointerDown={(event) => {
                isTouchRef.current = event.pointerType !== "mouse";
              }}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") {
                  onOpenChange(question.questionId);
                }
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse" && isOpen) {
                  onOpenChange(null);
                }
              }}
              aria-label={`${question.member}議員の質問、${question.text}、質問の詳細を見る`}
              aria-expanded={isOpen}
              className="budget-map-v2-question-hit h-auto hover:bg-transparent"
              style={
                {
                  "--budget-q-avatar": `${orbit.avatarPx}px`,
                  "--budget-q-mark": `${orbit.markPx}px`,
                  "--budget-q-mark-right": `${-orbit.markRightPx}px`,
                  "--budget-q-mark-bottom": `${-orbit.markBottomPx}px`,
                  "--budget-q-gap": `${orbit.gapPx}px`,
                  "--budget-q-body-padding": `${orbit.bodyPaddingRightPx}px`,
                  "--budget-q-label-size": `${orbit.labelFontPx}px`,
                  "--budget-q-member-size": `${orbit.memberFontPx}px`,
                  // 写真は img の src ではなく background-image で指定する。
                  "--budget-q-photo": `url("${encodeURI(question.photo)}")`,
                  ...getOpenStateVariables(isOpen, orbit),
                } as BudgetMapV2Style
              }
            >
              <span className="budget-map-v2-question-chip" data-open={isOpen}>
                <span className="budget-map-v2-question-avatar-wrap">
                  <span
                    aria-hidden="true"
                    className="budget-map-v2-question-avatar"
                    data-open={isOpen}
                  />
                  <span
                    aria-hidden="true"
                    className="budget-map-v2-question-mark"
                  >
                    <MessageCircleQuestion
                      style={{
                        width: orbit.markIconPx,
                        height: orbit.markIconPx,
                      }}
                      strokeWidth={2.4}
                    />
                  </span>
                </span>
                <span
                  className="budget-map-v2-question-body"
                  data-open={isOpen}
                >
                  <span className="budget-map-v2-question-text">
                    {question.text}
                  </span>
                  <span className="budget-map-v2-question-member">
                    {question.member}
                  </span>
                </span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
