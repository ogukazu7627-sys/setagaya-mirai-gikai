import { describe, expect, it } from "vitest";
import { RECOMMENDATION_CATEGORY_OPTIONS } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import {
  buildGeneralQuestionCategoryCards,
  buildGeneralQuestionCategoryReferences,
} from "./general-question-categories";

const QUESTION_COUNTS = {
  "administration-finance": 39,
  education: 30,
  "urban-development": 29,
  welfare: 25,
  "child-rearing": 20,
  environment: 13,
  industry: 12,
  "disaster-prevention": 12,
  "daily-life": 11,
  "culture-sports": 8,
} as const;

describe("general question categories", () => {
  it("199件の一般質問を定義順の10枚へ集約する", () => {
    const sources = RECOMMENDATION_CATEGORY_OPTIONS.flatMap((category) =>
      Array.from({ length: QUESTION_COUNTS[category.id] }, (_, index) => ({
        id: `${category.id}-${index + 1}`,
        majorCategory: category.label,
        submittedDate: index === 0 ? "2026-02-20" : "2026-02-18",
      }))
    );

    const cards = buildGeneralQuestionCategoryCards(
      [
        ...sources,
        {
          id: "unknown-category",
          majorCategory: "未定義",
          submittedDate: "2026-02-21",
        },
      ],
      2026
    );

    expect(sources).toHaveLength(199);
    expect(cards).toHaveLength(10);
    expect(cards.map(({ categoryId }) => categoryId)).toEqual(
      RECOMMENDATION_CATEGORY_OPTIONS.map(({ id }) => id)
    );
    expect(
      Object.fromEntries(
        cards.map(({ categoryId, questionCount }) => [
          categoryId,
          questionCount,
        ])
      )
    ).toEqual(QUESTION_COUNTS);
    expect(cards.reduce((total, card) => total + card.questionCount, 0)).toBe(
      199
    );
    expect(cards[0]).toMatchObject({
      categoryId: "education",
      name: "教育",
      latestSubmittedDate: "2026-02-20",
      year: 2026,
    });
  });

  it("サイトマップ用URLを年と大分類で一意にする", () => {
    expect(
      buildGeneralQuestionCategoryReferences([
        {
          majorCategory: "教育🏫",
          sessionStartDate: "2026-01-01",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          majorCategory: "教育🏫",
          sessionStartDate: "2026-06-01",
          updatedAt: "2026-08-03T00:00:00.000Z",
        },
        {
          majorCategory: "防災☔",
          sessionStartDate: "2025-06-01",
          updatedAt: "2025-08-01T00:00:00.000Z",
        },
      ])
    ).toEqual([
      {
        categoryId: "education",
        year: 2026,
        updatedAt: "2026-08-03T00:00:00.000Z",
      },
      {
        categoryId: "disaster-prevention",
        year: 2025,
        updatedAt: "2025-08-01T00:00:00.000Z",
      },
    ]);
  });
});
