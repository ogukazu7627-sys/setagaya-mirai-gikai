import { describe, expect, it, vi } from "vitest";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import type { PublishedGeneralQuestion } from "../../shared/types/general-question";
import {
  loadGeneralQuestionCategoryPage,
  resolveLegacyGeneralQuestionCategoryRoute,
} from "./load-general-question-category-page";

describe("loadGeneralQuestionCategoryPage", () => {
  it("指定した会期と大分類だけを取得し、難易度に応じた本文を新しい順で返す", async () => {
    const firstSession = createSession({
      id: "session-2026-1",
      name: "令和8年第1回定例会",
      slug: "2026-1",
      start_date: "2026-02-01",
    });
    const secondSession = createSession({
      id: "session-2026-2",
      name: "令和8年第2回定例会",
      slug: "2026-2",
      start_date: "2026-06-01",
    });
    const findSessions = vi
      .fn()
      .mockResolvedValue([secondSession, firstSession]);
    const findQuestions = vi.fn().mockResolvedValue([
      createQuestion("older", "2026-02-18", {
        normal: createContent("normal", "やさしい本文"),
      }),
      createQuestion("newer", "2026-02-20", {
        normal: createContent("normal", "通常本文"),
        hard: createContent("hard", "詳しい本文"),
      }),
      createQuestion("without-content", "2026-02-19", {}),
    ]);

    const result = await loadGeneralQuestionCategoryPage(
      {
        categoryId: "education",
        year: 2026,
        sessionKey: "2026-1",
        difficultyLevel: "hard",
      },
      { findSessions, findQuestions }
    );

    expect(findSessions).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
    expect(findQuestions).toHaveBeenCalledWith({
      dietSessionIds: ["session-2026-1"],
      majorCategory: "教育🏫",
    });
    expect(result?.dietSession).toEqual({
      id: "session-2026-1",
      name: "令和8年第1回定例会",
      slug: "2026-1",
      startDate: "2026-02-01",
    });
    expect(result?.questions.map(({ id }) => id)).toEqual(["newer", "older"]);
    expect(result?.questions[0].selectedContent.content).toBe("詳しい本文");
    expect(result?.questions[1].selectedContent.content).toBe("やさしい本文");
  });

  it("旧URLは同じ大分類を持つ最新の会期へ解決する", async () => {
    const firstSession = createSession({
      id: "session-2026-1",
      name: "令和8年第1回定例会",
      slug: "2026-1",
      start_date: "2026-02-01",
    });
    const secondSession = createSession({
      id: "session-2026-2",
      name: "令和8年第2回定例会",
      slug: "2026-2",
      start_date: "2026-06-01",
    });

    const result = await resolveLegacyGeneralQuestionCategoryRoute(
      { categoryId: "education", year: 2026, focusBillId: null },
      {
        findSessions: vi.fn().mockResolvedValue([secondSession, firstSession]),
        findCategoryCards: vi
          .fn()
          .mockResolvedValue([
            createCategoryCard(firstSession),
            createCategoryCard(secondSession),
          ]),
      }
    );

    expect(result).toEqual({
      categoryId: "education",
      year: 2026,
      sessionKey: "2026-2",
      focusBillId: null,
    });
  });

  it("旧URLに質問IDがあれば、その質問が属する会期へ解決する", async () => {
    const result = await resolveLegacyGeneralQuestionCategoryRoute(
      {
        categoryId: "education",
        year: 2026,
        focusBillId: "11111111-1111-4111-8111-111111111111",
      },
      {
        findReference: vi.fn().mockResolvedValue({
          categoryId: "education",
          year: 2026,
          sessionKey: "2026-1",
          sessionName: "令和8年第1回定例会",
        }),
      }
    );

    expect(result).toEqual({
      categoryId: "education",
      year: 2026,
      sessionKey: "2026-1",
      focusBillId: "11111111-1111-4111-8111-111111111111",
    });
  });
});

function createSession(overrides: Partial<DietSession>): DietSession {
  return {
    id: "session-2026",
    name: "令和8年定例会",
    slug: "2026-session",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    shugiin_url: null,
    is_active: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createCategoryCard(session: DietSession) {
  return {
    categoryId: "education" as const,
    name: "教育",
    majorCategory: "教育🏫",
    description: "学校、教育環境、学びの支援",
    year: 2026,
    dietSession: {
      id: session.id,
      name: session.name,
      slug: session.slug,
      startDate: session.start_date,
    },
    questionCount: 1,
    latestSubmittedDate: session.start_date,
  };
}

function createContent(difficultyLevel: "normal" | "hard", content: string) {
  return {
    difficultyLevel,
    title: `${content}の題名`,
    summary: `${content}の概要`,
    content,
  };
}

function createQuestion(
  id: string,
  submittedDate: string,
  contents: PublishedGeneralQuestion["contents"]
): PublishedGeneralQuestion {
  return {
    id,
    name: id,
    categoryId: "education",
    majorCategory: "教育🏫",
    submittedDate,
    publishedAt: `${submittedDate}T00:00:00.000Z`,
    updatedAt: `${submittedDate}T00:00:00.000Z`,
    dietSession: {
      id: "session-2026-1",
      name: "令和8年第1回定例会",
      slug: "2026-1",
      startDate: "2026-02-01",
    },
    partyOrGroup: "会派名",
    councilor: {
      id: `councilor-${id}`,
      displayName: id,
      iconUrl: null,
    },
    contents,
  };
}
