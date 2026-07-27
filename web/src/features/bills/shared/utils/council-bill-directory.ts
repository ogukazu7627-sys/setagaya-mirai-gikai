import {
  RECOMMENDATION_CATEGORY_OPTIONS,
  type RecommendationCategoryId,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type {
  CouncilBillDirectoryEntry,
  CouncilBillDirectoryFilters,
  CouncilThemeCategorySummary,
} from "../types/council-bill-directory";
import { compareBillsForHomeList } from "./sort-bills";

export function buildCouncilThemeCategorySummaries(
  entries: readonly CouncilBillDirectoryEntry[]
): CouncilThemeCategorySummary[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.majorCategory) {
      counts.set(
        entry.majorCategory,
        (counts.get(entry.majorCategory) ?? 0) + 1
      );
    }
  }

  return RECOMMENDATION_CATEGORY_OPTIONS.flatMap((category) => {
    const count = counts.get(category.label) ?? 0;
    return count > 0 ? [{ category, count }] : [];
  });
}

export function resolveInitialCouncilThemeCategoryId(
  categories: readonly CouncilThemeCategorySummary[]
): RecommendationCategoryId | null {
  return categories[0]?.category.id ?? null;
}

export function paginateCouncilBillDirectoryEntries(
  entries: readonly CouncilBillDirectoryEntry[],
  filters: CouncilBillDirectoryFilters,
  requestedPage: number,
  pageSize: number
) {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const filteredEntries = entries
    .filter((entry) => matchesCouncilBillFilters(entry, filters))
    .sort((left, right) =>
      compareBillsForHomeList(
        {
          item_type: left.itemType,
          submitted_date: left.submittedDate,
        },
        {
          item_type: right.itemType,
          submitted_date: right.submittedDate,
        }
      )
    );
  const total = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(
    Math.max(1, Math.floor(requestedPage)),
    totalPages
  );
  const startIndex = (currentPage - 1) * normalizedPageSize;

  return {
    billIds: filteredEntries
      .slice(startIndex, startIndex + normalizedPageSize)
      .map(({ id }) => id),
    total,
    currentPage,
    totalPages,
  };
}

function matchesCouncilBillFilters(
  entry: CouncilBillDirectoryEntry,
  filters: CouncilBillDirectoryFilters
): boolean {
  if (filters.contentType !== "all" && entry.itemType !== filters.contentType) {
    return false;
  }
  if (filters.majorCategory && entry.majorCategory !== filters.majorCategory) {
    return false;
  }
  if (filters.committeeName && entry.committeeName !== filters.committeeName) {
    return false;
  }
  return true;
}
