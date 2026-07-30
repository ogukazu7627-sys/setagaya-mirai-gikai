import "server-only";

import { type ZodType, z } from "zod";
import { BUDGET_ACCOUNT_CODES } from "../../shared/constants/budget";
import type {
  BudgetAccountCode,
  BudgetOfficialHierarchy,
  BudgetOverview,
  BudgetProgramDetail,
  BudgetProgramSearchInput,
  BudgetProgramSearchResult,
  BudgetRevenueItemDetail,
} from "../../shared/types/budget";
import { budgetProgramSearchInputSchema } from "../../shared/utils/budget-search-schema";
import {
  findBudgetOfficialHierarchy,
  findBudgetOverview,
  findBudgetProgramDetail,
  findBudgetPrograms,
  findBudgetRevenueItem,
} from "../repositories/budget-repository";
import {
  budgetOfficialHierarchyRpcSchema,
  budgetOverviewRpcSchema,
  budgetProgramDetailRpcSchema,
  budgetProgramSearchRowSchema,
  budgetRevenueItemDetailRpcSchema,
} from "../schemas/budget-rpc-schema";

const fiscalYearSchema = z
  .number()
  .int()
  .min(2000)
  .max(2200)
  .nullable()
  .default(null);
const identityIdSchema = z.string().trim().min(1).max(200);
const revenueItemKeySchema = z.string().trim().min(1).max(200);

export class BudgetDataNotFoundError extends Error {
  constructor(
    readonly code: "budget-program-not-found" | "budget-revenue-item-not-found"
  ) {
    super("Budget data was not found");
    this.name = "BudgetDataNotFoundError";
  }
}

export async function getBudgetOverview(
  fiscalYear: number | null = null
): Promise<BudgetOverview> {
  const parsedFiscalYear = fiscalYearSchema.parse(fiscalYear);
  const raw = await findBudgetOverview(parsedFiscalYear);
  return parseRpcResult(budgetOverviewRpcSchema, raw);
}

export async function searchBudgetPrograms(
  input: BudgetProgramSearchInput
): Promise<BudgetProgramSearchResult> {
  const parsedInput = budgetProgramSearchInputSchema.parse(input);
  const rows = await findBudgetPrograms(parsedInput);
  const parsedRows = rows.map((row) =>
    parseRpcResult(budgetProgramSearchRowSchema, row)
  );

  return {
    items: parsedRows.map((row) => row.item),
    total: parsedRows[0]?.totalCount ?? 0,
    page: parsedInput.page,
    pageSize: parsedInput.pageSize,
  };
}

export async function getBudgetProgramDetail(
  budgetProgramIdentityId: string,
  fiscalYear: number | null = null
): Promise<BudgetProgramDetail> {
  const parsedIdentityId = identityIdSchema.parse(budgetProgramIdentityId);
  const parsedFiscalYear = fiscalYearSchema.parse(fiscalYear);
  const raw = await findBudgetProgramDetail({
    budgetProgramIdentityId: parsedIdentityId,
    fiscalYear: parsedFiscalYear,
  });
  if (raw === null) {
    throw new BudgetDataNotFoundError("budget-program-not-found");
  }
  return parseRpcResult(budgetProgramDetailRpcSchema, raw);
}

export async function getBudgetOfficialHierarchy(
  input: {
    fiscalYear?: number | null;
    accountCode?: BudgetAccountCode | null;
  } = {}
): Promise<BudgetOfficialHierarchy> {
  const parsed = z
    .strictObject({
      fiscalYear: fiscalYearSchema,
      accountCode: z.enum(BUDGET_ACCOUNT_CODES).nullable().default(null),
    })
    .parse(input);
  const raw = await findBudgetOfficialHierarchy(parsed);
  return parseRpcResult(budgetOfficialHierarchyRpcSchema, raw);
}

export async function getBudgetRevenueItem(
  revenueItemKey: string,
  fiscalYear: number | null = null
): Promise<BudgetRevenueItemDetail> {
  const parsedRevenueItemKey = revenueItemKeySchema.parse(revenueItemKey);
  const parsedFiscalYear = fiscalYearSchema.parse(fiscalYear);
  const raw = await findBudgetRevenueItem({
    revenueItemKey: parsedRevenueItemKey,
    fiscalYear: parsedFiscalYear,
  });
  if (raw === null) {
    throw new BudgetDataNotFoundError("budget-revenue-item-not-found");
  }
  return parseRpcResult(budgetRevenueItemDetailRpcSchema, raw);
}

function parseRpcResult<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error("Budget read model returned an invalid response");
  }
  return result.data;
}
