import "server-only";

import { BUDGET_PUBLIC_FISCAL_YEAR } from "../../shared/constants/budget";
import type { BudgetPageOverview } from "../../shared/types/budget-page";
import {
  buildBudgetPageOverview,
  buildUnavailableBudgetPageOverview,
} from "../../shared/utils/budget-page-view";
import { getBudgetOverview } from "../services/budget-query-service";

export async function loadBudgetPageOverview(): Promise<BudgetPageOverview> {
  try {
    const overview = await getBudgetOverview(BUDGET_PUBLIC_FISCAL_YEAR);
    return buildBudgetPageOverview(overview);
  } catch (error) {
    console.error("[budget] Failed to load the public overview", error);
    return buildUnavailableBudgetPageOverview(BUDGET_PUBLIC_FISCAL_YEAR);
  }
}
