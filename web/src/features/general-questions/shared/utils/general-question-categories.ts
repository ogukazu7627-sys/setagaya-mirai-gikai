import {
  RECOMMENDATION_CATEGORY_OPTIONS,
  type RecommendationCategoryId,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type {
  GeneralQuestionCategoryCardData,
  GeneralQuestionCategoryReference,
} from "../types/general-question";

export type GeneralQuestionCategorySource = {
  id: string;
  majorCategory: string | null;
  submittedDate: string | null;
};

export type GeneralQuestionCategoryReferenceSource = {
  majorCategory: string | null;
  sessionStartDate: string | null;
  updatedAt: string;
};

export function getGeneralQuestionCategoryById(
  categoryId: string
): (typeof RECOMMENDATION_CATEGORY_OPTIONS)[number] | null {
  return (
    RECOMMENDATION_CATEGORY_OPTIONS.find(
      (category) => category.id === categoryId
    ) ?? null
  );
}

export function getGeneralQuestionCategoryByMajorCategory(
  majorCategory: string | null | undefined
): (typeof RECOMMENDATION_CATEGORY_OPTIONS)[number] | null {
  return (
    RECOMMENDATION_CATEGORY_OPTIONS.find(
      (category) => category.label === majorCategory
    ) ?? null
  );
}

export function buildGeneralQuestionCategoryCards(
  sources: readonly GeneralQuestionCategorySource[],
  year: number
): GeneralQuestionCategoryCardData[] {
  const grouped = new Map<
    RecommendationCategoryId,
    { count: number; latestSubmittedDate: string | null }
  >();

  for (const source of sources) {
    const category = getGeneralQuestionCategoryByMajorCategory(
      source.majorCategory
    );
    if (!category) continue;

    const current = grouped.get(category.id) ?? {
      count: 0,
      latestSubmittedDate: null,
    };
    current.count += 1;
    if (
      source.submittedDate &&
      (!current.latestSubmittedDate ||
        source.submittedDate > current.latestSubmittedDate)
    ) {
      current.latestSubmittedDate = source.submittedDate;
    }
    grouped.set(category.id, current);
  }

  return RECOMMENDATION_CATEGORY_OPTIONS.flatMap((category) => {
    const summary = grouped.get(category.id);
    return summary
      ? [
          {
            categoryId: category.id,
            name: category.name,
            majorCategory: category.label,
            description: category.description,
            year,
            questionCount: summary.count,
            latestSubmittedDate: summary.latestSubmittedDate,
          },
        ]
      : [];
  });
}

export function buildGeneralQuestionCategoryReferences(
  sources: readonly GeneralQuestionCategoryReferenceSource[]
): GeneralQuestionCategoryReference[] {
  const references = new Map<string, GeneralQuestionCategoryReference>();

  for (const source of sources) {
    const category = getGeneralQuestionCategoryByMajorCategory(
      source.majorCategory
    );
    const yearMatch = source.sessionStartDate?.match(/^(\d{4})/u);
    if (!category || !yearMatch) continue;

    const year = Number(yearMatch[1]);
    const key = `${year}:${category.id}`;
    const current = references.get(key);
    if (!current || source.updatedAt > current.updatedAt) {
      references.set(key, {
        categoryId: category.id,
        year,
        updatedAt: source.updatedAt,
      });
    }
  }

  return Array.from(references.values()).sort(
    (left, right) =>
      right.year - left.year || left.categoryId.localeCompare(right.categoryId)
  );
}
