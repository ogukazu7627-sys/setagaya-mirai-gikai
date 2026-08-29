import { describe, expect, it } from "vitest";
import type { PublishedBillSeoData } from "../../server/loaders/get-published-bill-seo-data";
import {
  buildBillStructuredData,
  serializeJsonLd,
} from "./build-bill-structured-data";

describe("buildBillStructuredData", () => {
  it("Article、Breadcrumb、FAQPageを同じgraphへ含める", () => {
    const result = buildBillStructuredData(createData(), {
      canonicalUrl: "https://civictech-setagaya.org/bills/1",
      siteUrl: "https://civictech-setagaya.org",
      imageUrl: "https://civictech-setagaya.org/ogp.jpg",
    });

    expect(result["@graph"].map((item) => item["@type"])).toEqual([
      "Article",
      "BreadcrumbList",
      "FAQPage",
    ]);
  });

  it("script終了タグに使われる文字を安全にescapeする", () => {
    expect(serializeJsonLd({ value: "</script>" })).toBe(
      '{"value":"\\u003c/script>"}'
    );
  });
});

function createData(): PublishedBillSeoData {
  return {
    billId: "1",
    formalName: "正式名称",
    subjectTitle: "学校改築について",
    title: "学校改築について | みらい議会＠世田谷区",
    description: "学校改築について説明します。",
    keywords: ["学校改築"],
    majorCategory: "教育🏫",
    submittedDate: "2026-08-29",
    dietSessionName: "令和8年第3回定例会",
    publishedAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
    thumbnailUrl: null,
    shareThumbnailUrl: null,
    faqItems: [{ question: "いつですか？", answer: "令和8年度です。" }],
    profile: null,
  };
}
