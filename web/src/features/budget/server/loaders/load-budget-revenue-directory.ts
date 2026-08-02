import "server-only";

import {
  BUDGET_PUBLIC_FISCAL_YEAR,
  BUDGET_REVENUE_DIRECTORY_PAGE_SIZE,
} from "../../shared/constants/budget";
import type {
  BudgetDirectoryInput,
  BudgetRevenueDirectory,
} from "../../shared/types/budget";
import { createBudgetDirectorySelection } from "../../shared/utils/budget-directory";
import {
  buildUnavailableBudgetRevenueDirectory,
  getBudgetRevenueDirectory,
} from "../services/budget-directory-service";

export async function loadBudgetRevenueDirectory(
  input: BudgetDirectoryInput
): Promise<BudgetRevenueDirectory> {
  try {
    return await getBudgetRevenueDirectory(input);
  } catch (error) {
    console.error("[budget] Failed to load the revenue directory", error);
    return buildUnavailableBudgetRevenueDirectory(
      createBudgetDirectorySelection(input, {
        fiscalYear: input.fiscalYear ?? BUDGET_PUBLIC_FISCAL_YEAR,
        pageSize: BUDGET_REVENUE_DIRECTORY_PAGE_SIZE,
      })
    );
  }
}
