"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BudgetExplorerStableView,
  BudgetExplorerTransitionTarget,
} from "../../shared/types/budget-exploration";
import {
  BUDGET_MAP_V2_ARRIVE_MS,
  BUDGET_MAP_V2_DIVE_MS,
  BUDGET_MAP_V2_MAX_WARP_MS,
  BUDGET_MAP_V2_MIN_WARP_MS,
  type BudgetMapV2Phase,
  type BudgetMapV2TransitionKind,
  getBudgetMapV2TransitionKind,
} from "../../shared/utils/budget-map-v2-transition";

export type BudgetMapV2PhaseState = {
  phase: BudgetMapV2Phase;
  kind: BudgetMapV2TransitionKind | null;
  target: BudgetExplorerTransitionTarget | null;
  /** ワープトンネルを出すのは forward の warp 中だけ。 */
  showWarp: boolean;
};

const IDLE_STATE: BudgetMapV2PhaseState = {
  phase: "idle",
  kind: null,
  target: null,
  showWarp: false,
};

export function getBudgetMapV2TransitionTargetKey(
  target: BudgetExplorerTransitionTarget
): string {
  switch (target.kind) {
    case "overview":
      return "overview";
    case "category":
      return `category:${target.category.slug}`;
    case "topic":
      return `topic:${target.category.slug}:${target.topic.slug}`;
    case "program":
      return `program:${target.budgetProgramIdentityId}`;
  }
}

/**
 * 「寄る → ワープ → 新ページ」の3段を管理する。
 *
 * 遷移の開始も終了も、親ページが持つ `transitionTarget` を唯一の合図にする。
 * 目的地が入ったら寄り始め、親が目的地を外したら遷移完了とみなして着地する。
 * 描画中の画面と目的地を突き合わせて終了を判定すると、両者が同じ commit で
 * 更新されたときに終了を取りこぼし、ワープが閉じなくなる。
 *
 * ワープは次画面が届くまで続き、そこで読み込みを吸収する。
 * 届かないまま固まらないよう上限時間を設ける。
 */
export function useBudgetMapV2Phase(input: {
  stableView: BudgetExplorerStableView;
  transitionTarget: BudgetExplorerTransitionTarget | null;
  reduceMotion: boolean;
}): BudgetMapV2PhaseState {
  const { reduceMotion, stableView, transitionTarget } = input;
  const [state, setState] = useState<BudgetMapV2PhaseState>(IDLE_STATE);

  const timersRef = useRef<number[]>([]);
  const warpStartedAtRef = useRef<number | null>(null);
  const targetKey = transitionTarget
    ? getBudgetMapV2TransitionTargetKey(transitionTarget)
    : null;

  // 遷移開始時点の値だけを使うため、依存に載せずに ref から読む。
  const latestRef = useRef({ stableView, transitionTarget });
  latestRef.current = { stableView, transitionTarget };
  // 開発時の二重実行でも同じ結果になるよう、判定は state ではなく
  // 描画済みの phase を映した ref から行う。
  const phaseRef = useRef<BudgetMapV2Phase>(state.phase);
  phaseRef.current = state.phase;

  const clearTimers = useCallback(() => {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const { stableView: currentView, transitionTarget: currentTarget } =
      latestRef.current;
    clearTimers();

    // 親が目的地を外したら遷移完了。ワープを閉じて着地する。
    if (!(targetKey && currentTarget)) {
      if (phaseRef.current === "idle") {
        return;
      }
      if (reduceMotion) {
        warpStartedAtRef.current = null;
        setState(IDLE_STATE);
        return;
      }
      const warpStartedAt = warpStartedAtRef.current;
      const remainingWarpMs =
        warpStartedAt === null
          ? 0
          : Math.max(
              0,
              BUDGET_MAP_V2_MIN_WARP_MS - (Date.now() - warpStartedAt)
            );
      timersRef.current.push(
        window.setTimeout(() => {
          warpStartedAtRef.current = null;
          setState({ ...IDLE_STATE, phase: "arrive" });
          timersRef.current.push(
            window.setTimeout(
              () => setState(IDLE_STATE),
              BUDGET_MAP_V2_ARRIVE_MS
            )
          );
        }, remainingWarpMs)
      );
      return clearTimers;
    }

    const kind = getBudgetMapV2TransitionKind(currentView, currentTarget);

    if (reduceMotion) {
      warpStartedAtRef.current = null;
      setState({ ...IDLE_STATE, kind, target: currentTarget });
      return;
    }

    setState({ phase: "dive", kind, target: currentTarget, showWarp: false });
    warpStartedAtRef.current = null;

    // 戻りと事業選択はワープを挟まず、1回のカメラ移動で終える。
    if (kind !== "forward") {
      return clearTimers;
    }

    timersRef.current.push(
      window.setTimeout(() => {
        warpStartedAtRef.current = Date.now();
        setState((current) =>
          current.phase === "dive"
            ? { ...current, phase: "warp", showWarp: true }
            : current
        );
      }, BUDGET_MAP_V2_DIVE_MS),
      // 次画面が届かないままでも、必ず操作可能な状態へ戻す。
      window.setTimeout(() => {
        warpStartedAtRef.current = null;
        setState(IDLE_STATE);
      }, BUDGET_MAP_V2_DIVE_MS + BUDGET_MAP_V2_MAX_WARP_MS)
    );
    return clearTimers;
  }, [clearTimers, reduceMotion, targetKey]);

  useEffect(() => clearTimers, [clearTimers]);

  return state;
}
