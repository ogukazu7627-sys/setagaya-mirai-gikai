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

const budgetHierarchyLabelSchema = z.strictObject({
  code: z.string(),
  name: z.string(),
});

export const budgetProgramSearchResponseSchema = z.strictObject({
  items: z.array(
    z.strictObject({
      datasetId: z.uuid(),
      budgetProgramIdentityId: z.string().min(1),
      fiscalYear: z.number().int().min(2000).max(2200),
      accountCode: z.enum(BUDGET_ACCOUNT_CODES),
      accountName: z.string(),
      budgetItemKey: z.string().min(1),
      kan: budgetHierarchyLabelSchema,
      kou: budgetHierarchyLabelSchema,
      moku: budgetHierarchyLabelSchema,
      displayProgramName: z.string(),
      departmentDisplayName: z.string(),
      amountThousandYen: z.number().int().refine(Number.isSafeInteger),
      memberGroupCount: z.number().int().nonnegative(),
      memberProgramCount: z.number().int().nonnegative(),
      relatedRevenueCount: z.number().int().nonnegative(),
      hasPublicIdentityResolution: z.boolean(),
      isZeroAmount: z.boolean(),
      publishedTopics: z.array(
        z.strictObject({
          slug: z.string().min(1),
          name: z.string().min(1),
        })
      ),
      score: z.number().finite(),
      matchedField: z.string(),
    })
  ),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type BudgetProgramSearchRequest = z.infer<
  typeof budgetProgramSearchRequestSchema
>;
