import type { BillPublicationCategory } from "@/features/bills/shared/types";

export type CouncilorQuestionVenue = "general" | "budget" | "committee";

export type CouncilorQuestionCounts = {
  total: number;
  general: number;
  budget: number;
  committee: number;
};

export const COUNCILOR_QUESTION_COUNT_LABELS = {
  total: "掲載中の質問",
  general: "議会での質問",
  budget: "予算委員会での質問",
  committee: "所属委員会での質問",
} as const satisfies Record<keyof CouncilorQuestionCounts, string>;

export function createEmptyCouncilorQuestionCounts(): CouncilorQuestionCounts {
  return {
    total: 0,
    general: 0,
    budget: 0,
    committee: 0,
  };
}

export function getCouncilorQuestionVenue(
  publicationCategory: BillPublicationCategory
): CouncilorQuestionVenue {
  switch (publicationCategory) {
    case "general_question":
      return "general";
    case "budget":
      return "budget";
    case "report":
      return "committee";
  }
}

export function addCouncilorQuestionCount(
  counts: CouncilorQuestionCounts,
  publicationCategory: BillPublicationCategory
): CouncilorQuestionCounts {
  const venue = getCouncilorQuestionVenue(publicationCategory);
  return {
    ...counts,
    total: counts.total + 1,
    [venue]: counts[venue] + 1,
  };
}

export function buildCouncilorQuestionCounts(
  publicationCategories: readonly BillPublicationCategory[]
): CouncilorQuestionCounts {
  return publicationCategories.reduce(
    addCouncilorQuestionCount,
    createEmptyCouncilorQuestionCounts()
  );
}

export function mergeCouncilorQuestionCounts(
  questionCounts: readonly CouncilorQuestionCounts[]
): CouncilorQuestionCounts {
  return questionCounts.reduce(
    (total, counts) => ({
      total: total.total + counts.total,
      general: total.general + counts.general,
      budget: total.budget + counts.budget,
      committee: total.committee + counts.committee,
    }),
    createEmptyCouncilorQuestionCounts()
  );
}
