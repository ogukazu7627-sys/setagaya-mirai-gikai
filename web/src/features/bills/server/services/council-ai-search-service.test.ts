import { describe, expect, it, vi } from "vitest";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import type { BillCardData } from "../../shared/types";
import type { CouncilAiSearchRequest } from "../../shared/types/council-ai-search";
import { searchCouncilBills } from "./council-ai-search-service";

const input: CouncilAiSearchRequest = {
  installationId: "11111111-1111-4111-8111-111111111111",
  query: "防災について教えて",
  contentType: "all",
  themeId: "",
  committeeName: "",
};

const session = {
  id: "22222222-2222-4222-8222-222222222222",
} as DietSession;

describe("searchCouncilBills", () => {
  it("JSTの今年に始まる会期だけを検索RPCへ渡す", async () => {
    const search = vi.fn().mockResolvedValue([
      {
        billId: "33333333-3333-4333-8333-333333333333",
        score: 1,
        semanticSimilarity: 0.8,
        keywordScore: 10,
      },
    ]);
    const findSessions = vi.fn().mockResolvedValue([session]);
    const card = createCard("33333333-3333-4333-8333-333333333333");
    const loadCards = vi.fn().mockResolvedValue([card]);

    const result = await searchCouncilBills(input, {
      now: () => new Date("2026-07-27T12:00:00+09:00"),
      findSessions,
      findCouncilors: async () => [],
      embedQuery: async () => Array.from({ length: 512 }, () => 0),
      search,
      getDifficulty: async () => "normal",
      loadCards,
    });

    expect(findSessions).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        dietSessionIds: [session.id],
        similarityThreshold: 0.4,
      })
    );
    expect(result.mode).toBe("hybrid");
    expect(result.billIds).toHaveLength(1);
    expect(result.bills).toEqual([card]);
    expect(loadCards).toHaveBeenCalledWith(
      ["33333333-3333-4333-8333-333333333333"],
      [session.id],
      "normal"
    );
  });

  it("Embeddingが失敗しても通常検索へフォールバックする", async () => {
    const search = vi.fn().mockResolvedValue([]);

    const result = await searchCouncilBills(input, {
      findSessions: async () => [session],
      findCouncilors: async () => [],
      embedQuery: async () => {
        throw new Error("gateway unavailable");
      },
      search,
      getDifficulty: async () => "normal",
      loadCards: async () => [],
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ queryEmbedding: null })
    );
    expect(result.mode).toBe("keyword-fallback");
  });

  it("ベクトル検索が落ちてもキーワードのみで引き直す", async () => {
    const card = createCard("33333333-3333-4333-8333-333333333333");
    const search = vi
      .fn()
      .mockRejectedValueOnce(new Error("vector index unavailable"))
      .mockResolvedValueOnce([
        {
          billId: card.id,
          score: 1,
          semanticSimilarity: null,
          keywordScore: 10,
        },
      ]);

    const result = await searchCouncilBills(input, {
      findSessions: async () => [session],
      findCouncilors: async () => [],
      embedQuery: async () => Array.from({ length: 512 }, () => 0),
      search,
      getDifficulty: async () => "normal",
      loadCards: async () => [card],
    });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0].queryEmbedding).not.toBeNull();
    expect(search.mock.calls[1][0].queryEmbedding).toBeNull();
    expect(result.mode).toBe("keyword-fallback");
    expect(result.bills).toEqual([card]);
  });

  it("キーワード検索まで落ちた場合はエラーを伝播する", async () => {
    const failure = new Error("database unavailable");
    const search = vi.fn().mockRejectedValue(failure);

    await expect(
      searchCouncilBills(input, {
        findSessions: async () => [session],
        findCouncilors: async () => [],
        embedQuery: async () => {
          throw new Error("gateway unavailable");
        },
        search,
        getDifficulty: async () => "normal",
        loadCards: async () => [],
      })
    ).rejects.toBe(failure);
    // Embedding が無い状態での失敗は縮退できないため、1回で諦める。
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("一般質問の検索一致を大分類カードへまとめて先頭の一致質問を保持する", async () => {
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

    const result = await searchCouncilBills(input, {
      now: () => new Date("2026-07-27T12:00:00+09:00"),
      findSessions: async () => [session],
      findCouncilors: async () => [],
      embedQuery: async () => Array.from({ length: 512 }, () => 0),
      search: async () =>
        matchedCards.map((card, index) => ({
          billId: card.id,
          score: 1 - index / 10,
          semanticSimilarity: 0.8,
          keywordScore: 10,
        })),
      getDifficulty: async () => "normal",
      loadCards: async () => matchedCards,
      findGeneralQuestionCategories,
    });

    expect(findGeneralQuestionCategories).toHaveBeenCalledWith(
      [session.id],
      2026
    );
    expect(result.billIds).toEqual([
      educationFirst.id,
      educationSecond.id,
      report.id,
    ]);
    expect(result.bills).toEqual([report]);
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

  it("解決できない議員名を意味検索へ流さない", async () => {
    const search = vi.fn();
    const embedQuery = vi.fn();

    const result = await searchCouncilBills(
      { ...input, query: "未来太郎議員について教えて" },
      {
        findSessions: async () => [session],
        findCouncilors: async () => [],
        embedQuery,
        search,
      }
    );

    expect(result).toEqual({
      billIds: [],
      bills: [],
      items: [],
      total: 0,
      mode: "keyword-fallback",
    });
    expect(embedQuery).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
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
