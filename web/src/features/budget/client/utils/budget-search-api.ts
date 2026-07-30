import type { BudgetProgramSearchResult } from "../../shared/types/budget";
import { budgetProgramSearchResponseSchema } from "../../shared/utils/budget-search-schema";

export async function requestBudgetProgramSearch(
  input: {
    installationId: string;
    query: string;
  },
  signal?: AbortSignal
): Promise<BudgetProgramSearchResult> {
  const response = await fetch("/api/budget/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("Budget search request failed");
  }
  const parsed = budgetProgramSearchResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Budget search returned an invalid response");
  }
  return parsed.data;
}
