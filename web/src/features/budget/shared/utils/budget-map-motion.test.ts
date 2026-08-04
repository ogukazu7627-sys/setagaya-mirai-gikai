import { describe, expect, it } from "vitest";
import type { BudgetExplorationCategory } from "../types/budget-exploration";
import {
  BUDGET_MAP_PROGRAM_TRANSITION_DURATION_MS,
  BUDGET_MAP_SCENE_TRANSITION_DURATION_MS,
  getBudgetMapTransitionDuration,
} from "./budget-map-motion";

const category = {
  slug: "education",
} as BudgetExplorationCategory;

describe("budget map motion", () => {
  it("ページ移動は280〜420ms、事業遷移は220〜320msに収める", () => {
    expect(getBudgetMapTransitionDuration({ kind: "category", category })).toBe(
      BUDGET_MAP_SCENE_TRANSITION_DURATION_MS
    );
    expect(
      getBudgetMapTransitionDuration({
        kind: "program",
        budgetProgramIdentityId: "bpi_school",
      })
    ).toBe(BUDGET_MAP_PROGRAM_TRANSITION_DURATION_MS);
    expect(BUDGET_MAP_SCENE_TRANSITION_DURATION_MS).toBeGreaterThanOrEqual(280);
    expect(BUDGET_MAP_SCENE_TRANSITION_DURATION_MS).toBeLessThanOrEqual(420);
    expect(BUDGET_MAP_PROGRAM_TRANSITION_DURATION_MS).toBeGreaterThanOrEqual(
      220
    );
    expect(BUDGET_MAP_PROGRAM_TRANSITION_DURATION_MS).toBeLessThanOrEqual(320);
  });
});
