import "server-only";

import { cache } from "react";
import { BUDGET_PUBLIC_FISCAL_YEAR } from "../../shared/constants/budget";
import { getBudgetProgramDetail } from "../services/budget-query-service";

export const loadBudgetProgramDetail = cache(
  async (budgetProgramIdentityId: string) =>
    getBudgetProgramDetail(budgetProgramIdentityId, BUDGET_PUBLIC_FISCAL_YEAR)
);
