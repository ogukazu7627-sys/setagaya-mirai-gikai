import { describe, expect, it } from "vitest";
import type { CouncilSearchCouncilor } from "../types/council-ai-search";
import {
  buildCouncilSearchIntent,
  normalizeCouncilSearchText,
  resolveCouncilorMentions,
} from "./council-search-intent";

const councilors: CouncilSearchCouncilor[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "佐藤美樹",
    normalizedName: "佐藤美樹",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    displayName: "佐藤正幸",
    normalizedName: "佐藤正幸",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    displayName: "上川あや",
    normalizedName: "上川あや",
  },
];

describe("buildCouncilSearchIntent", () => {
  it("子育ての生活者向け質問を既存テーマ語彙へ展開する", () => {
    const result = buildCouncilSearchIntent(
      "いま子育て世代が知っておくべきものを教えて",
      councilors
    );

    expect(result.terms).toContain("子育て");
    expect(result.terms).toContain("保育所");
    expect(result.embeddingText).toContain("テーマ: 子育て");
    expect(result.embeddingText).toContain("妊産婦支援");
  });

  it("明示された議員名を構造化条件へ変換する", () => {
    const result = buildCouncilSearchIntent(
      "上川あや議員に関連するものを教えて",
      councilors
    );

    expect(result.councilorIds).toEqual([
      "33333333-3333-4333-8333-333333333333",
    ]);
    expect(result.councilorNames).toEqual(["上川あや"]);
    expect(result.terms).toContain("上川あや");
  });

  it("存在しない議員名を既存議員へ推測しない", () => {
    const result = buildCouncilSearchIntent(
      "未来太郎議員について教えて",
      councilors
    );

    expect(result.councilorIds).toEqual([]);
    expect(result.councilorNames).toEqual([]);
    expect(result.hasUnresolvedCouncilorMention).toBe(true);
  });
});

describe("resolveCouncilorMentions", () => {
  it("名字だけで曖昧な場合は該当する全員を返す", () => {
    const result = resolveCouncilorMentions("佐藤議員の発言", councilors);

    expect(result.map((councilor) => councilor.displayName)).toEqual([
      "佐藤美樹",
      "佐藤正幸",
    ]);
  });
});

describe("normalizeCouncilSearchText", () => {
  it("全角英数と余分な空白を正規化する", () => {
    expect(normalizeCouncilSearchText("  ＡＩ   防災  ")).toBe("ai 防災");
  });
});
