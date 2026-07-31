import type { BudgetExplorerTransitionTarget } from "../types/budget-exploration";

export const BUDGET_MAP_SCENE_TRANSITION_DURATION_MS = 360;
export const BUDGET_MAP_PROGRAM_TRANSITION_DURATION_MS = 280;

export function getBudgetMapTransitionDuration(
  target: BudgetExplorerTransitionTarget
): number {
  return target.kind === "program"
    ? BUDGET_MAP_PROGRAM_TRANSITION_DURATION_MS
    : BUDGET_MAP_SCENE_TRANSITION_DURATION_MS;
}
