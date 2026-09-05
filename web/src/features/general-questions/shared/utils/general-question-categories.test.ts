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

const FIRST_SESSION = {
  id: "session-2026-1",
  name: "令和8年第1回定例会",
  slug: "2026-1",
  startDate: "2026-02-01",
} as const;
const SECOND_SESSION = {
  id: "session-2026-2",
  name: "令和8年第2回定例会",
  slug: "2026-2",
  startDate: "2026-06-01",
} as const;

describe("general question categories", () => {
  it("199件の一般質問を定義順の10枚へ集約する", () => {
    const sources = RECOMMENDATION_CATEGORY_OPTIONS.flatMap((category) =>
      Array.from({ length: QUESTION_COUNTS[category.id] }, (_, index) => ({
        id: `${category.id}-${index + 1}`,
        majorCategory: category.label,
        submittedDate: index === 0 ? "2026-02-20" : "2026-02-18",
        dietSession: FIRST_SESSION,
      }))
    );

    const cards = buildGeneralQuestionCategoryCards(
      [
        ...sources,
        {
          id: "unknown-category",
          majorCategory: "未定義",
          submittedDate: "2026-02-21",
          dietSession: FIRST_SESSION,
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
      dietSession: FIRST_SESSION,
    });
  });

  it("同じ年・大分類でも定例会が異なれば別カードにする", () => {
    const cards = buildGeneralQuestionCategoryCards(
      [
        {
          id: "first-session-question",
          majorCategory: "教育🏫",
          submittedDate: "2026-02-20",
          dietSession: FIRST_SESSION,
        },
        {
          id: "second-session-question",
          majorCategory: "教育🏫",
          submittedDate: "2026-06-20",
          dietSession: SECOND_SESSION,
        },
      ],
      2026
    );

    expect(cards).toHaveLength(2);
    expect(
      cards.map((card) => ({
        sessionId: card.dietSession.id,
        questionCount: card.questionCount,
      }))
    ).toEqual([
      { sessionId: "session-2026-2", questionCount: 1 },
      { sessionId: "session-2026-1", questionCount: 1 },
    ]);
  });

  it("サイトマップ用URLを会期と大分類で一意にする", () => {
    expect(
      buildGeneralQuestionCategoryReferences([
        {
          majorCategory: "教育🏫",
          dietSession: FIRST_SESSION,
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          majorCategory: "教育🏫",
          dietSession: SECOND_SESSION,
          updatedAt: "2026-08-03T00:00:00.000Z",
        },
        {
          majorCategory: "防災☔",
          dietSession: {
            id: "session-2025-2",
            name: "令和7年第2回定例会",
            slug: "2025-2",
            startDate: "2025-06-01",
          },
          updatedAt: "2025-08-01T00:00:00.000Z",
        },
      ])
    ).toEqual([
      {
        categoryId: "education",
        year: 2026,
        sessionKey: "2026-2",
        sessionName: "令和8年第2回定例会",
        sessionStartDate: "2026-06-01",
        updatedAt: "2026-08-03T00:00:00.000Z",
      },
      {
        categoryId: "education",
        year: 2026,
        sessionKey: "2026-1",
        sessionName: "令和8年第1回定例会",
        sessionStartDate: "2026-02-01",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
      {
        categoryId: "disaster-prevention",
        year: 2025,
        sessionKey: "2025-2",
        sessionName: "令和7年第2回定例会",
        sessionStartDate: "2025-06-01",
        updatedAt: "2025-08-01T00:00:00.000Z",
      },
    ]);
  });
});
