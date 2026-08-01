import type {
  BudgetExplorerStableView,
  BudgetExplorerTransitionTarget,
} from "../types/budget-exploration";
import type { BudgetMapPosition } from "./budget-map-layout";
import { getUnitVector, round } from "./budget-map-v2-geometry";

/**
 * 画面遷移は「寄る → ワープ → 新ページ」の3段。
 * ワープ中に次画面のデータ取得を吸収する。
 * 戻りはワープを挟まず、1回のカメラ移動で前画面へ戻る。
 */

export type BudgetMapV2Phase = "idle" | "dive" | "warp" | "arrive";

export const BUDGET_MAP_V2_DIVE_MS = 330;
export const BUDGET_MAP_V2_MIN_WARP_MS = 400;
/** 遷移が届かないまま固まらないよう、ワープには上限を設ける。 */
export const BUDGET_MAP_V2_MAX_WARP_MS = 1600;
export const BUDGET_MAP_V2_ARRIVE_MS = 40;
export const BUDGET_MAP_V2_SETTLE_MS = 300;
export const BUDGET_MAP_V2_BACK_MS = 340;
export const BUDGET_MAP_V2_PROGRAM_MS = 280;

export const BUDGET_MAP_V2_DIVE_ZOOM = 3.6;
export const BUDGET_MAP_V2_ARRIVE_ZOOM = 1.06;
export const BUDGET_MAP_V2_PROGRAM_ZOOM = 1.34;
/** 目的地側の球体の縁まで、中心から進む距離。 */
export const BUDGET_MAP_V2_DIVE_REACH = 74;

export const BUDGET_MAP_V2_EASE_DIVE = "cubic-bezier(.5,0,1,.5)";
export const BUDGET_MAP_V2_EASE_SETTLE = "cubic-bezier(.1,.7,.2,1)";
export const BUDGET_MAP_V2_EASE_BACK = "cubic-bezier(.2,.7,.2,1)";

export type BudgetMapV2TransitionKind = "forward" | "back" | "program";

const VIEW_DEPTH = { overview: 0, category: 1, topic: 2 } as const;

export function getBudgetMapV2ViewDepth(
  view: BudgetExplorerStableView
): number {
  return VIEW_DEPTH[view.kind];
}

/**
 * 遷移の種類を決める。浅い階層へ向かうものは戻りとして扱い、
 * ワープを出さない。
 */
export function getBudgetMapV2TransitionKind(
  current: BudgetExplorerStableView,
  target: BudgetExplorerTransitionTarget
): BudgetMapV2TransitionKind {
  if (target.kind === "program") {
    return "program";
  }
  return getBudgetMapV2ViewDepth(target) < getBudgetMapV2ViewDepth(current)
    ? "back"
    : "forward";
}

/**
 * dive で寄る先。中心から目的地の方向へ一定距離だけ進んだ、
 * 球体の目的地側の縁。
 */
export function getBudgetMapV2DiveFocus(
  center: BudgetMapPosition,
  destination: BudgetMapPosition,
  reach = BUDGET_MAP_V2_DIVE_REACH
): BudgetMapPosition {
  const { ux, uy } = getUnitVector(center, destination);
  return {
    x: round(center.x + ux * reach),
    y: round(center.y + uy * reach),
  };
}

export type BudgetMapV2CameraStep = {
  focus: BudgetMapPosition;
  zoom: number;
  durationMs: number;
  easing: string;
};

/**
 * フェーズごとのカメラ指定を返す。
 * reduced-motion では所要時間を 0 にして1フレームで着地させる。
 */
export function getBudgetMapV2CameraStep(input: {
  phase: BudgetMapV2Phase;
  kind: BudgetMapV2TransitionKind | null;
  restFocus: BudgetMapPosition;
  diveFocus: BudgetMapPosition | null;
  reduceMotion: boolean;
}): BudgetMapV2CameraStep {
  const { diveFocus, kind, phase, reduceMotion, restFocus } = input;

  if (reduceMotion) {
    return {
      focus: restFocus,
      zoom: 1,
      durationMs: 0,
      easing: "linear",
    };
  }

  if (phase === "dive" && diveFocus) {
    if (kind === "program") {
      return {
        focus: diveFocus,
        zoom: BUDGET_MAP_V2_PROGRAM_ZOOM,
        durationMs: BUDGET_MAP_V2_PROGRAM_MS,
        easing: BUDGET_MAP_V2_EASE_BACK,
      };
    }
    if (kind === "back") {
      return {
        focus: restFocus,
        zoom: 1,
        durationMs: BUDGET_MAP_V2_BACK_MS,
        easing: BUDGET_MAP_V2_EASE_BACK,
      };
    }
    return {
      focus: diveFocus,
      zoom: BUDGET_MAP_V2_DIVE_ZOOM,
      durationMs: BUDGET_MAP_V2_DIVE_MS,
      easing: BUDGET_MAP_V2_EASE_DIVE,
    };
  }

  if (phase === "arrive") {
    return {
      focus: restFocus,
      zoom: BUDGET_MAP_V2_ARRIVE_ZOOM,
      durationMs: 0,
      easing: "linear",
    };
  }

  if (phase === "warp") {
    return {
      focus: diveFocus ?? restFocus,
      zoom: BUDGET_MAP_V2_DIVE_ZOOM,
      durationMs: 0,
      easing: "linear",
    };
  }

  return {
    focus: restFocus,
    zoom: 1,
    durationMs: BUDGET_MAP_V2_SETTLE_MS,
    easing: BUDGET_MAP_V2_EASE_SETTLE,
  };
}

/** ワープトンネルのシェル。コア1枚 + シェル7枚を DOM と CSS だけで描く。 */
export type BudgetMapV2WarpShell = {
  id: string;
  sizePx: number;
  gapDegrees: number;
  widthDegrees: number;
  fromDegrees: number;
  tintIndex: number;
  spin: "a" | "b";
  durationMs: number;
  delayMs: number;
};

export const BUDGET_MAP_V2_WARP_SHELL_COUNT = 7;
export const BUDGET_MAP_V2_WARP_TINT_COUNT = 4;

export function createBudgetMapV2WarpShells(): BudgetMapV2WarpShell[] {
  return Array.from({ length: BUDGET_MAP_V2_WARP_SHELL_COUNT }, (_, index) => ({
    id: `v2-warp-shell-${index}`,
    sizePx: 380 + index * 250,
    gapDegrees: Math.round((2 + index * 0.55) * 100) / 100,
    widthDegrees: Math.round((0.5 + (index % 3) * 0.25) * 100) / 100,
    fromDegrees: index * 23,
    tintIndex: index % BUDGET_MAP_V2_WARP_TINT_COUNT,
    spin: index % 2 === 0 ? "a" : "b",
    durationMs: 480 + index * 26,
    delayMs: index * 14,
  }));
}
