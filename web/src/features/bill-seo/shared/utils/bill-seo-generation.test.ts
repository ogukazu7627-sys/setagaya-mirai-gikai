import { describe, expect, it } from "vitest";
import {
  normalizeGeneratedBillSeo,
  validateGeneratedBillSeo,
} from "./bill-seo-generation";

describe("bill SEO generation", () => {
  it("サイト名のsuffixと重複keywordを除去する", () => {
    expect(
      normalizeGeneratedBillSeo({
        seoTitle: "  子育て支援制度の見直し | みらい議会＠世田谷区 ",
        seoDescription:
          "世田谷区の子育て支援制度について、対象者や課題、議会で確認された今後の対応を分かりやすく紹介します。",
        seoKeywords: ["#子育て支援", "子育て支援", " 保育所 "],
      })
    ).toEqual({
      seoTitle: "子育て支援制度の見直し",
      seoDescription:
        "世田谷区の子育て支援制度について、対象者や課題、議会で確認された今後の対応を分かりやすく紹介します。",
      seoKeywords: ["子育て支援", "保育所"],
    });
  });

  it("文字数とkeyword件数を検証する", () => {
    const issues = validateGeneratedBillSeo({
      seoTitle: "",
      seoDescription: "短い説明",
      seoKeywords: ["教育"],
    });

    expect(issues).toHaveLength(3);
    expect(issues.join(" ")).toContain("SEOタイトルが空");
    expect(issues.join(" ")).toContain("50文字以上");
    expect(issues.join(" ")).toContain("3〜8件");
  });
});
