import type { GeneralQuestionCategoryCardData } from "@/features/general-questions/shared/types/general-question";
import {
  RECOMMENDATION_CATEGORY_OPTIONS,
  type RecommendationCategoryId,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { BillCardData } from "../types";
import type {
  CouncilBillDirectoryFilters,
  CouncilDirectoryEntry,
  CouncilDirectoryItem,
  CouncilGeneralQuestionDirectoryEntry,
  CouncilThemeCategorySummary,
} from "../types/council-bill-directory";
import { compareBillsForHomeList } from "./sort-bills";

export function buildCouncilThemeCategorySummaries(
  entries: readonly CouncilDirectoryEntry[]
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
  entries: readonly CouncilDirectoryEntry[],
  filters: CouncilBillDirectoryFilters,
  requestedPage: number,
  pageSize: number
) {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const filteredEntries = entries
    .filter((entry) => matchesCouncilBillFilters(entry, filters))
    .sort(compareCouncilDirectoryEntries);
  const total = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(
    Math.max(1, Math.floor(requestedPage)),
    totalPages
  );
  const startIndex = (currentPage - 1) * normalizedPageSize;

  const pageEntries = filteredEntries.slice(
    startIndex,
    startIndex + normalizedPageSize
  );

  return {
    entries: pageEntries,
    billIds: pageEntries.flatMap((entry) =>
      entry.kind === "general-question-category" ? [] : [entry.id]
    ),
    total,
    currentPage,
    totalPages,
  };
}

function matchesCouncilBillFilters(
  entry: CouncilDirectoryEntry,
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

function compareCouncilDirectoryEntries(
  left: CouncilDirectoryEntry,
  right: CouncilDirectoryEntry
): number {
  const leftIsCategory = left.kind === "general-question-category";
  const rightIsCategory = right.kind === "general-question-category";
  if (leftIsCategory !== rightIsCategory) {
    return leftIsCategory ? -1 : 1;
  }

  return compareBillsForHomeList(
    {
      item_type: left.itemType,
      submitted_date: left.submittedDate,
    },
    {
      item_type: right.itemType,
      submitted_date: right.submittedDate,
    }
  );
}

export function toGeneralQuestionDirectoryEntries(
  categories: readonly GeneralQuestionCategoryCardData[]
): CouncilGeneralQuestionDirectoryEntry[] {
  return categories.map((category) => ({
    kind: "general-question-category",
    id: `general-question:${category.year}:${category.categoryId}`,
    itemType: "question",
    majorCategory: category.majorCategory,
    committeeName: null,
    submittedDate: category.latestSubmittedDate,
    category,
  }));
}

export function buildCouncilDirectoryItems(
  entries: readonly CouncilDirectoryEntry[],
  bills: readonly BillCardData[]
): CouncilDirectoryItem[] {
  const billsById = new Map(bills.map((bill) => [bill.id, bill]));

  return entries.flatMap((entry): CouncilDirectoryItem[] => {
    if (entry.kind === "general-question-category") {
      return [
        {
          kind: "general-question-category",
          category: entry.category,
        },
      ];
    }

    const bill = billsById.get(entry.id);
    return bill ? [{ kind: "bill", bill }] : [];
  });
}
