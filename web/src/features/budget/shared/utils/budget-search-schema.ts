import { z } from "zod";
import {
  BUDGET_ACCOUNT_CODES,
  BUDGET_SEARCH_DEFAULT_PAGE_SIZE,
  BUDGET_SEARCH_MAX_PAGE,
  BUDGET_SEARCH_MAX_PAGE_SIZE,
  BUDGET_SEARCH_MAX_QUERY_LENGTH,
} from "../constants/budget";

export const budgetProgramSearchInputSchema = z.strictObject({
  query: z.string().trim().min(1).max(BUDGET_SEARCH_MAX_QUERY_LENGTH),
  fiscalYear: z.number().int().min(2000).max(2200).nullable().default(null),
  accountCode: z.enum(BUDGET_ACCOUNT_CODES).nullable().default(null),
  includeZeroAmount: z.boolean().default(false),
  page: z.number().int().min(1).max(BUDGET_SEARCH_MAX_PAGE).default(1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(BUDGET_SEARCH_MAX_PAGE_SIZE)
    .default(BUDGET_SEARCH_DEFAULT_PAGE_SIZE),
});

export const budgetProgramSearchRequestSchema =
  budgetProgramSearchInputSchema.extend({
    installationId: z.uuid(),
  });

export type BudgetProgramSearchRequest = z.infer<
  typeof budgetProgramSearchRequestSchema
>;
