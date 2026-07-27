import { describe, expect, it } from "vitest";
import type { BillCardData } from "@/features/bills/shared/types";
import type { TodayRecommendationsResponse } from "../../shared/types/recommendation";
import {
  isTodayRecommendationsCacheFresh,
  readTodayRecommendationsCache,
  removeTodayRecommendationsCache,
  TODAY_RECOMMENDATIONS_CACHE_KEY,
  writeTodayRecommendationsCache,
} from "./today-recommendations-cache";

const identity = {
  installationId: "11111111-1111-4111-8111-111111111111",
  preferenceVersion: 1,
  difficultyLevel: "normal" as const,
  recommendationDate: "2026-07-27",
};
const data: TodayRecommendationsResponse = {
  recommendationDate: identity.recommendationDate,
  bills: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "テスト案件",
      tags: [],
      bill_content: { title: "テスト案件", summary: "概要" },
    } as unknown as BillCardData,
  ],
  selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
  selectedParentCategoryIds: ["education", "disaster-prevention"],
  preferenceVersion: identity.preferenceVersion,
  pushEnabled: false,
  vapidPublicKey: null,
};

describe("today recommendations cache", () => {
  it("同じ匿名プロフィール・日付・設定・難易度の当日分を復元する", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(writeTodayRecommendationsCache(storage, identity, data)).toBe(true);
    const cached = readTodayRecommendationsCache(storage, identity);
    expect(cached?.data).toEqual(data);
    expect(cached && isTodayRecommendationsCacheFresh(cached)).toBe(true);
  });

  it("5分を過ぎたキャッシュは再検証対象にする", () => {
    expect(
      isTodayRecommendationsCacheFresh(
        {
          cachedAt: "2026-07-27T00:00:00.000Z",
          data,
        },
        Date.parse("2026-07-27T00:05:00.000Z")
      )
    ).toBe(false);
  });

  it("日付・設定バージョン・難易度のいずれかが違えば利用しない", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    writeTodayRecommendationsCache(storage, identity, data);

    expect(
      readTodayRecommendationsCache(storage, {
        ...identity,
        recommendationDate: "2026-07-28",
      })
    ).toBeNull();
    expect(
      readTodayRecommendationsCache(storage, {
        ...identity,
        preferenceVersion: 2,
      })
    ).toBeNull();
    expect(
      readTodayRecommendationsCache(storage, {
        ...identity,
        difficultyLevel: "hard",
      })
    ).toBeNull();
  });

  it("壊れた値を無視し、削除できる", () => {
    const values = new Map([[TODAY_RECOMMENDATIONS_CACHE_KEY, "{bad"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };

    expect(readTodayRecommendationsCache(storage, identity)).toBeNull();
    expect(removeTodayRecommendationsCache(storage)).toBe(true);
    expect(values.has(TODAY_RECOMMENDATIONS_CACHE_KEY)).toBe(false);
  });
});
