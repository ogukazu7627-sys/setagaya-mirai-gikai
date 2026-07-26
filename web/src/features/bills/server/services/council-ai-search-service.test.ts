import { describe, expect, it, vi } from "vitest";
import type { DietSession } from "@/features/diet-sessions/shared/types";
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

    const result = await searchCouncilBills(input, {
      now: () => new Date("2026-07-27T12:00:00+09:00"),
      findSessions,
      findCouncilors: async () => [],
      embedQuery: async () => Array.from({ length: 512 }, () => 0),
      search,
    });

    expect(findSessions).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        dietSessionIds: [session.id],
        similarityThreshold: 0.35,
      })
    );
    expect(result.mode).toBe("hybrid");
    expect(result.billIds).toHaveLength(1);
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
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ queryEmbedding: null })
    );
    expect(result.mode).toBe("keyword-fallback");
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
      total: 0,
      mode: "keyword-fallback",
    });
    expect(embedQuery).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });
});
