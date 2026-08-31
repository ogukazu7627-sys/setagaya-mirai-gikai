import { describe, expect, it, vi } from "vitest";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import type { BillCardData } from "../../shared/types";
import type { CouncilKeywordSearchRequest } from "../../shared/types/council-keyword-search";
import { searchCouncilBillsByKeyword } from "./council-keyword-search-service";

const input: CouncilKeywordSearchRequest = {
  installationId: "11111111-1111-4111-8111-111111111111",
  query: "防災について教えて",
  contentType: "all",
  themeId: "",
  committeeName: "",
};

const session = {
  id: "22222222-2222-4222-8222-222222222222",
} as DietSession;

describe("searchCouncilBillsByKeyword", () => {
  it("入力語を展開せず、JSTの今年に始まる公開案件だけを検索する", async () => {
    const billId = "33333333-3333-4333-8333-333333333333";
    const card = createCard(billId);
    const search = vi.fn().mockResolvedValue([billId]);
    const findSessions = vi.fn().mockResolvedValue([session]);
    const loadCards = vi.fn().mockResolvedValue([card]);

    const result = await searchCouncilBillsByKeyword(
      {
        ...input,
        query: "  防災について教えて  ",
        contentType: "report",
        themeId: "disaster-prevention",
        committeeName: "企画総務常任委員会",
      },
      {
        now: () => new Date("2026-07-27T12:00:00+09:00"),
        findSessions,
        search,
        getDifficulty: async () => "normal",
        loadCards,
      }
    );

    expect(findSessions).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
    expect(search).toHaveBeenCalledWith({
      keyword: "防災について教えて",
      dietSessionIds: [session.id],
      contentType: "report",
      majorCategory: "防災☔",
      committeeName: "企画総務常任委員会",
    });
    expect(loadCards).toHaveBeenCalledWith([billId], [session.id], "normal");
    expect(result).toEqual({
      items: [{ kind: "bill", bill: card }],
      total: 1,
    });
  });

  it("今年に始まる会期がなければDB検索を行わない", async () => {
    const search = vi.fn();
    const loadCards = vi.fn();

    const result = await searchCouncilBillsByKeyword(input, {
      findSessions: async () => [],
      search,
      getDifficulty: async () => "normal",
      loadCards,
    });

    expect(result).toEqual({ items: [], total: 0 });
    expect(search).not.toHaveBeenCalled();
    expect(loadCards).not.toHaveBeenCalled();
  });

  it("DB検索が失敗した場合はAPI層へエラーを伝播する", async () => {
    const failure = new Error("database unavailable");

    await expect(
      searchCouncilBillsByKeyword(input, {
        findSessions: async () => [session],
        search: async () => {
          throw failure;
        },
        getDifficulty: async () => "normal",
      })
    ).rejects.toBe(failure);
  });

  it("一般質問の一致を大分類カードへまとめて先頭の一致質問を保持する", async () => {
    const educationFirst = {
      ...createCard("education-first"),
      item_type: "question" as const,
      publication_category: "general_question" as const,
      major_category: "教育🏫",
    };
    const educationSecond = {
      ...createCard("education-second"),
      item_type: "question" as const,
      publication_category: "general_question" as const,
      major_category: "教育🏫",
    };
    const report = {
      ...createCard("report"),
      item_type: "report" as const,
      publication_category: "report" as const,
    };
    const matchedCards = [educationFirst, educationSecond, report];
    const findGeneralQuestionCategories = vi.fn().mockResolvedValue([
      {
        categoryId: "education",
        name: "教育",
        majorCategory: "教育🏫",
        description: "学校、教育環境、学びの支援",
        year: 2026,
        questionCount: 30,
        latestSubmittedDate: "2026-02-20",
      },
    ]);

    const result = await searchCouncilBillsByKeyword(input, {
      now: () => new Date("2026-07-27T12:00:00+09:00"),
      findSessions: async () => [session],
      search: async () => matchedCards.map(({ id }) => id),
      getDifficulty: async () => "normal",
      loadCards: async () => matchedCards,
      findGeneralQuestionCategories,
    });

    expect(findGeneralQuestionCategories).toHaveBeenCalledWith(
      [session.id],
      2026
    );
    expect(result.items).toEqual([
      expect.objectContaining({
        kind: "general-question-category",
        category: expect.objectContaining({
          categoryId: "education",
          questionCount: 30,
          focusBillId: educationFirst.id,
        }),
      }),
      { kind: "bill", bill: report },
    ]);
    expect(result.total).toBe(2);
  });
});

function createCard(id: string): BillCardData {
  return {
    id,
    name: id,
    item_type: "bill",
    major_category: "防災☔",
    status: "introduced",
    status_label: null,
    status_note: null,
    submitted_date: "2026-07-01",
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: true,
    interview_enabled: false,
    hasPublicInterview: false,
    bill_content: { title: id, summary: id },
    tags: [],
  };
}
