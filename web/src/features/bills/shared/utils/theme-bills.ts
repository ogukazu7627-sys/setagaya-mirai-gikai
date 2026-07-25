import type { BillsByMajorCategory, BillWithContent } from "../types";

export const THEME_BILLS_PAGE_SIZE = 10;

export function resolveInitialThemeCategoryId(
  groups: readonly BillsByMajorCategory[],
  preferredCategoryIds: readonly string[]
): string | null {
  const availableCategoryIds = new Set<string>(
    groups.map(({ category }) => category.id)
  );

  return (
    preferredCategoryIds.find((id) => availableCategoryIds.has(id)) ??
    groups[0]?.category.id ??
    null
  );
}

export function paginateThemeBills(
  bills: readonly BillWithContent[],
  requestedPage: number,
  pageSize = THEME_BILLS_PAGE_SIZE
) {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(bills.length / normalizedPageSize));
  const currentPage = Math.min(
    Math.max(1, Math.floor(requestedPage)),
    totalPages
  );
  const startIndex = (currentPage - 1) * normalizedPageSize;

  return {
    bills: bills.slice(startIndex, startIndex + normalizedPageSize),
    currentPage,
    totalPages,
  };
}
