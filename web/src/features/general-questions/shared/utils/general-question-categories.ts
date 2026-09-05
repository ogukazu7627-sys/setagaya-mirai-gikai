import {
  RECOMMENDATION_CATEGORY_OPTIONS,
  type RecommendationCategoryId,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type {
  GeneralQuestionCategoryCardData,
  GeneralQuestionCategoryReference,
  GeneralQuestionDietSession,
} from "../types/general-question";

export type GeneralQuestionCategorySource = {
  id: string;
  majorCategory: string | null;
  submittedDate: string | null;
  dietSession: GeneralQuestionDietSession | null;
};

export type GeneralQuestionCategoryReferenceSource = {
  majorCategory: string | null;
  dietSession: GeneralQuestionDietSession | null;
  updatedAt: string;
};

export function getGeneralQuestionSessionKey(
  dietSession: Pick<GeneralQuestionDietSession, "id" | "slug">
): string {
  return dietSession.slug ?? dietSession.id;
}

export function getGeneralQuestionCategoryGroupKey(
  dietSessionId: string,
  categoryId: RecommendationCategoryId
): string {
  return `${dietSessionId}:${categoryId}`;
}

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
    string,
    {
      categoryId: RecommendationCategoryId;
      count: number;
      dietSession: GeneralQuestionDietSession;
      latestSubmittedDate: string | null;
    }
  >();

  for (const source of sources) {
    const category = getGeneralQuestionCategoryByMajorCategory(
      source.majorCategory
    );
    if (!category || !source.dietSession) continue;

    const key = getGeneralQuestionCategoryGroupKey(
      source.dietSession.id,
      category.id
    );
    const current = grouped.get(key) ?? {
      categoryId: category.id,
      count: 0,
      dietSession: source.dietSession,
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
    grouped.set(key, current);
  }

  const categoryOrder = new Map(
    RECOMMENDATION_CATEGORY_OPTIONS.map((category, index) => [
      category.id,
      index,
    ])
  );

  return Array.from(grouped.values())
    .flatMap((summary): GeneralQuestionCategoryCardData[] => {
      const category = getGeneralQuestionCategoryById(summary.categoryId);
      return category
        ? [
            {
              categoryId: category.id,
              name: category.name,
              majorCategory: category.label,
              description: category.description,
              year,
              dietSession: summary.dietSession,
              questionCount: summary.count,
              latestSubmittedDate: summary.latestSubmittedDate,
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        (right.dietSession.startDate ?? "").localeCompare(
          left.dietSession.startDate ?? ""
        ) ||
        (categoryOrder.get(left.categoryId) ?? Number.MAX_SAFE_INTEGER) -
          (categoryOrder.get(right.categoryId) ?? Number.MAX_SAFE_INTEGER)
    );
}

export function buildGeneralQuestionCategoryReferences(
  sources: readonly GeneralQuestionCategoryReferenceSource[]
): GeneralQuestionCategoryReference[] {
  const references = new Map<string, GeneralQuestionCategoryReference>();

  for (const source of sources) {
    const category = getGeneralQuestionCategoryByMajorCategory(
      source.majorCategory
    );
    const yearMatch = source.dietSession?.startDate?.match(/^(\d{4})/u);
    if (!category || !yearMatch || !source.dietSession?.startDate) continue;

    const year = Number(yearMatch[1]);
    const key = getGeneralQuestionCategoryGroupKey(
      source.dietSession.id,
      category.id
    );
    const current = references.get(key);
    if (!current || source.updatedAt > current.updatedAt) {
      references.set(key, {
        categoryId: category.id,
        year,
        sessionKey: getGeneralQuestionSessionKey(source.dietSession),
        sessionName: source.dietSession.name,
        sessionStartDate: source.dietSession.startDate,
        updatedAt: source.updatedAt,
      });
    }
  }

  return Array.from(references.values()).sort(
    (left, right) =>
      right.sessionStartDate.localeCompare(left.sessionStartDate) ||
      left.categoryId.localeCompare(right.categoryId)
  );
}
