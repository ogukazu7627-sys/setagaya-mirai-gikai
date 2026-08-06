"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUDGET_MAP_TUTORIAL_AUTO_OPEN_MS,
  BUDGET_MAP_TUTORIAL_STORAGE_KEY,
  type BudgetMapTutorialStep,
  clampStepIndex,
  getBudgetMapTutorialAdvance,
  getBudgetMapTutorialHoldMs,
  getBudgetMapTutorialStep,
  shouldAutoOpenBudgetMapTutorial,
} from "../../shared/utils/budget-map-tutorial";

export type BudgetMapTutorialState = {
  step: BudgetMapTutorialStep | null;
  /** 航行中はカードとdimを退避する。 */
  held: boolean;
  open: () => void;
  next: () => void;
  previous: () => void;
  skip: () => void;
};

/**
 * チュートリアルの進行を管理する。
 *
 * 「次へ」はチュートリアル専用の遷移を持たず、ノードを押したときと
 * まったく同じコールバックを呼ぶ。表示だけの説明にしないため。
 */
export function useBudgetMapTutorial(input: {
  signedIn: boolean;
  tutorialSeen: boolean;
  reduceMotion: boolean;
  /** step1の「次へ」。分野ノードの onClick と同じもの。 */
  onAdvanceToCategory: () => void;
  /** step2の「次へ」。課題ノードの onClick と同じもの。 */
  onAdvanceToTopic: () => void;
  /** 「戻る」と「使い方」で前の画面へ巻き戻す。演出は挟まない。 */
  onRewind: (scene: "overview" | "category" | "topic") => void;
  /** 完了・スキップを親へ知らせる。 */
  onSeen: () => void;
}): BudgetMapTutorialState {
  const {
    onAdvanceToCategory,
    onAdvanceToTopic,
    onRewind,
    onSeen,
    reduceMotion,
    signedIn,
    tutorialSeen,
  } = input;
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const timersRef = useRef<number[]>([]);
  // 描画済みのステップを映す。更新関数の外から現在値を読むために使う。
  const stepIndexRef = useRef<number | null>(stepIndex);
  stepIndexRef.current = stepIndex;

  const latestRef = useRef({
    onAdvanceToCategory,
    onAdvanceToTopic,
    onRewind,
    onSeen,
    reduceMotion,
  });
  latestRef.current = {
    onAdvanceToCategory,
    onAdvanceToTopic,
    onRewind,
    onSeen,
    reduceMotion,
  };

  const clearTimers = useCallback(() => {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current = [];
  }, []);

  // 初回訪問時だけ、初期描画を邪魔しない間を置いて自動表示する。
  useEffect(() => {
    let storedValue: string | null = null;
    try {
      storedValue = window.localStorage.getItem(
        BUDGET_MAP_TUTORIAL_STORAGE_KEY
      );
    } catch {
      storedValue = null;
    }
    if (
      !shouldAutoOpenBudgetMapTutorial({ signedIn, tutorialSeen, storedValue })
    ) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setStepIndex(0);
    }, BUDGET_MAP_TUTORIAL_AUTO_OPEN_MS);
    timersRef.current.push(timerId);
    return () => window.clearTimeout(timerId);
  }, [signedIn, tutorialSeen]);

  useEffect(() => clearTimers, [clearTimers]);

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(BUDGET_MAP_TUTORIAL_STORAGE_KEY, "done");
    } catch {
      // localStorage が使えなくても、親への通知だけは行う。
    }
    latestRef.current.onSeen();
  }, []);

  const open = useCallback(() => {
    clearTimers();
    setHeld(false);
    // 再表示は必ず overview から始める。
    latestRef.current.onRewind("overview");
    setStepIndex(0);
  }, [clearTimers]);

  const skip = useCallback(() => {
    clearTimers();
    markSeen();
    setHeld(false);
    setStepIndex(null);
  }, [clearTimers, markSeen]);

  // 遷移の実行とタイマー設定は state 更新関数の外で行う。
  // 更新関数の中で副作用を起こすと、開発時の二重実行でタイマーを
  // 張っては消してしまい、カードが戻らなくなる。
  const next = useCallback(() => {
    const current = stepIndexRef.current;
    if (current === null) {
      return;
    }
    const advance = getBudgetMapTutorialAdvance(current);

    if (advance.kind === "finish") {
      clearTimers();
      markSeen();
      setHeld(false);
      setStepIndex(null);
      return;
    }
    if (advance.kind === "next-step") {
      setStepIndex(clampStepIndex(current + 1));
      return;
    }

    clearTimers();
    setHeld(true);
    // ノードのクリックとまったく同じ経路を通す。
    if (advance.kind === "select-category") {
      latestRef.current.onAdvanceToCategory();
    } else {
      latestRef.current.onAdvanceToTopic();
    }
    const holdMs = getBudgetMapTutorialHoldMs(latestRef.current.reduceMotion);
    timersRef.current.push(
      window.setTimeout(() => {
        setStepIndex(clampStepIndex(current + 1));
        setHeld(false);
      }, holdMs)
    );
  }, [clearTimers, markSeen]);

  const previous = useCallback(() => {
    const current = stepIndexRef.current;
    if (current === null || current <= 0) {
      return;
    }
    clearTimers();
    setHeld(false);
    const previousIndex = clampStepIndex(current - 1);
    latestRef.current.onRewind(getBudgetMapTutorialStep(previousIndex).scene);
    setStepIndex(previousIndex);
  }, [clearTimers]);

  return {
    step: stepIndex === null ? null : getBudgetMapTutorialStep(stepIndex),
    held,
    open,
    next,
    previous,
    skip,
  };
}
