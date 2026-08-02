import { z } from "zod";
import {
  BUDGET_ACCOUNT_CODES,
  BUDGET_DIRECTORY_MAX_PAGE,
  BUDGET_DIRECTORY_MAX_PAGE_SIZE,
} from "../constants/budget";
import type {
  BudgetAccountCode,
  BudgetDirectoryHierarchyEntry,
  BudgetDirectoryInput,
  BudgetDirectorySelection,
  BudgetDirectorySort,
  BudgetHierarchyLabel,
} from "../types/budget";

const hierarchyCodeSchema = z.string().regex(/^\d{2}$/);
const directorySortSchema = z.enum(["amount_desc", "name_asc"]);

export const budgetDirectoryInputSchema = z.strictObject({
  fiscalYear: z.number().int().min(2000).max(2200),
  accountCode: z.enum(BUDGET_ACCOUNT_CODES).nullable().default(null),
  kanCode: hierarchyCodeSchema.nullable().default(null),
  kouCode: hierarchyCodeSchema.nullable().default(null),
  mokuCode: hierarchyCodeSchema.nullable().default(null),
  includeZeroAmount: z.boolean().default(false),
  sort: directorySortSchema.default("amount_desc"),
  page: z.number().int().min(1).max(BUDGET_DIRECTORY_MAX_PAGE).default(1),
  pageSize: z.number().int().min(1).max(BUDGET_DIRECTORY_MAX_PAGE_SIZE),
});

export type BudgetDirectorySearchParams = Record<
  string,
  string | string[] | undefined
>;

export function parseBudgetDirectorySearchParams(
  searchParams: BudgetDirectorySearchParams
): Omit<BudgetDirectorySelection, "fiscalYear" | "pageSize"> {
  const accountCode = parseAccountCode(firstValue(searchParams.account));
  const kanCode = accountCode
    ? parseHierarchyCode(firstValue(searchParams.kan))
    : null;
  const kouCode = kanCode
    ? parseHierarchyCode(firstValue(searchParams.kou))
    : null;
  const mokuCode = kouCode
    ? parseHierarchyCode(firstValue(searchParams.moku))
    : null;

  return {
    accountCode,
    kanCode,
    kouCode,
    mokuCode,
    includeZeroAmount: firstValue(searchParams.includeZeroAmount) === "true",
    sort: parseSort(firstValue(searchParams.sort)),
    page: parsePage(firstValue(searchParams.page)),
  };
}

export function getBudgetHierarchyFilterOptions(
  hierarchy: BudgetDirectoryHierarchyEntry[],
  selection: Pick<
    BudgetDirectorySelection,
    "accountCode" | "kanCode" | "kouCode"
  >
): {
  accounts: Array<{ code: BudgetAccountCode; name: string }>;
  kans: BudgetHierarchyLabel[];
  kous: BudgetHierarchyLabel[];
  mokus: BudgetHierarchyLabel[];
} {
  const accountEntries = uniqueBy(
    hierarchy.map((entry) => ({
      code: entry.accountCode,
      name: entry.accountName,
    })),
    (entry) => entry.code
  );
  const scopedByAccount = selection.accountCode
    ? hierarchy.filter((entry) => entry.accountCode === selection.accountCode)
    : [];
  const scopedByKan = selection.kanCode
    ? scopedByAccount.filter((entry) => entry.kan.code === selection.kanCode)
    : [];
  const scopedByKou = selection.kouCode
    ? scopedByKan.filter((entry) => entry.kou.code === selection.kouCode)
    : [];

  return {
    accounts: accountEntries,
    kans: uniqueLabels(scopedByAccount.map((entry) => entry.kan)),
    kous: uniqueLabels(scopedByKan.map((entry) => entry.kou)),
    mokus: uniqueLabels(scopedByKou.map((entry) => entry.moku)),
  };
}

export function createBudgetDirectorySelection(
  input: BudgetDirectoryInput,
  defaults: { fiscalYear: number; pageSize: number }
): BudgetDirectorySelection {
  return budgetDirectoryInputSchema.parse({
    fiscalYear: input.fiscalYear ?? defaults.fiscalYear,
    accountCode: input.accountCode ?? null,
    kanCode: input.kanCode ?? null,
    kouCode: input.kouCode ?? null,
    mokuCode: input.mokuCode ?? null,
    includeZeroAmount: input.includeZeroAmount ?? false,
    sort: input.sort ?? "amount_desc",
    page: input.page ?? 1,
    pageSize: input.pageSize ?? defaults.pageSize,
  });
}

function uniqueLabels(labels: BudgetHierarchyLabel[]): BudgetHierarchyLabel[] {
  return uniqueBy(labels, (label) => `${label.code}\u0000${label.name}`);
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseAccountCode(value: string | undefined): BudgetAccountCode | null {
  const result = z.enum(BUDGET_ACCOUNT_CODES).safeParse(value);
  return result.success ? result.data : null;
}

function parseHierarchyCode(value: string | undefined): string | null {
  const result = hierarchyCodeSchema.safeParse(value);
  return result.success ? result.data : null;
}

function parseSort(value: string | undefined): BudgetDirectorySort {
  const result = directorySortSchema.safeParse(value);
  return result.success ? result.data : "amount_desc";
}

function parsePage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000 ? parsed : 1;
}
