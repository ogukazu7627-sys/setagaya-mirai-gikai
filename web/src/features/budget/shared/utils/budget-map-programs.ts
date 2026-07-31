export const BUDGET_MAP_PROGRAM_PAGE_SIZE = 10;

export type BudgetMapAmountTier = "low" | "medium" | "high";

export type BudgetMapProgramPage<T> = {
  items: T[];
  pageIndex: number;
  pageCount: number;
  startNumber: number;
  endNumber: number;
  totalCount: number;
};

export function getBudgetMapProgramPage<T>(
  programs: readonly T[],
  requestedPageIndex: number
): BudgetMapProgramPage<T> {
  const pageCount = Math.max(
    1,
    Math.ceil(programs.length / BUDGET_MAP_PROGRAM_PAGE_SIZE)
  );
  const pageIndex = clamp(Math.floor(requestedPageIndex), 0, pageCount - 1);
  const startIndex = pageIndex * BUDGET_MAP_PROGRAM_PAGE_SIZE;
  const items = programs.slice(
    startIndex,
    startIndex + BUDGET_MAP_PROGRAM_PAGE_SIZE
  );

  return {
    items,
    pageIndex,
    pageCount,
    startNumber: programs.length === 0 ? 0 : startIndex + 1,
    endNumber: startIndex + items.length,
    totalCount: programs.length,
  };
}

export function getBudgetMapAmountTier(
  amountThousandYen: number,
  amountsThousandYen: readonly number[]
): BudgetMapAmountTier {
  const sortedAmounts = amountsThousandYen
    .map((amount) => Math.max(0, amount))
    .toSorted((left, right) => left - right);
  if (sortedAmounts.length < 2) {
    return "medium";
  }

  const lowerBoundary = getQuantile(sortedAmounts, 1 / 3);
  const upperBoundary = getQuantile(sortedAmounts, 2 / 3);
  const normalizedAmount = Math.max(0, amountThousandYen);

  if (normalizedAmount <= lowerBoundary) {
    return "low";
  }
  if (normalizedAmount <= upperBoundary) {
    return "medium";
  }
  return "high";
}

function getQuantile(sortedValues: readonly number[], quantile: number) {
  const index = Math.min(
    sortedValues.length - 1,
    Math.floor((sortedValues.length - 1) * quantile)
  );
  return sortedValues[index] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
