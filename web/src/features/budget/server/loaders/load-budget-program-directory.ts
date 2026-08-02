import "server-only";

import {
  BUDGET_PROGRAM_DIRECTORY_PAGE_SIZE,
  BUDGET_PUBLIC_FISCAL_YEAR,
} from "../../shared/constants/budget";
import type {
  BudgetDirectoryInput,
  BudgetProgramDirectory,
} from "../../shared/types/budget";
import { createBudgetDirectorySelection } from "../../shared/utils/budget-directory";
import {
  buildUnavailableBudgetProgramDirectory,
  getBudgetProgramDirectory,
} from "../services/budget-directory-service";

export async function loadBudgetProgramDirectory(
  input: BudgetDirectoryInput
): Promise<BudgetProgramDirectory> {
  try {
    return await getBudgetProgramDirectory(input);
  } catch (error) {
    console.error("[budget] Failed to load the program directory", error);
    return buildUnavailableBudgetProgramDirectory(
      createBudgetDirectorySelection(input, {
        fiscalYear: input.fiscalYear ?? BUDGET_PUBLIC_FISCAL_YEAR,
        pageSize: BUDGET_PROGRAM_DIRECTORY_PAGE_SIZE,
      })
    );
  }
}
