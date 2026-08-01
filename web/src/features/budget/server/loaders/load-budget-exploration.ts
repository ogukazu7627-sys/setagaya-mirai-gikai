import "server-only";

import { BUDGET_EXPLORATION_CATEGORIES } from "../../shared/constants/budget";
import type { BudgetExplorationData } from "../../shared/types/budget-exploration";
import { getBudgetExplorationData } from "../services/budget-exploration-service";

export async function loadBudgetExploration(): Promise<BudgetExplorationData> {
  try {
    return await getBudgetExplorationData();
  } catch (error) {
    console.error("[budget] Failed to load the public exploration", error);
    return {
      activeDataset: null,
      availability: "temporarily_unavailable",
      categories: BUDGET_EXPLORATION_CATEGORIES.map((category, index) => ({
        id: `fallback-${category.slug}`,
        slug: category.slug,
        name: category.name,
        shortDescription: category.shortDescription,
        sortOrder: index + 1,
        tone: category.tone,
        topics: [],
      })),
    };
  }
}
