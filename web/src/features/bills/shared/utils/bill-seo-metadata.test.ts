import { describe, expect, it } from "vitest";
import {
  BILL_SEO_SITE_NAME,
  buildBillSeoMetadata,
  countSeoCharacters,
  normalizeSeoText,
} from "./bill-seo-metadata";

describe("buildBillSeoMetadata", () => {
  it("読みやすい案件名と既存summaryからメタデータを作る", () => {
    expect(
      buildBillSeoMetadata({
        name: "議案第1号",
        bill_content: {
          title: "災害対策を強化するには？",
          summary: "区の防災施策について整理します。",
        },
      })
    ).toEqual({
      subjectTitle: "災害対策を強化するには？",
      title: `災害対策を強化するには？ | ${BILL_SEO_SITE_NAME}`,
      description: "区の防災施策について整理します。",
    });
  });

  it("読みやすい案件名がない場合は正式名称を使う", () => {
    const metadata = buildBillSeoMetadata({
      name: "令和8年度世田谷区一般会計予算",
      bill_content: null,
    });

    expect(metadata.subjectTitle).toBe("令和8年度世田谷区一般会計予算");
    expect(metadata.description).toContain("令和8年度世田谷区一般会計予算");
  });

  it("案件名にサイト名が含まれる場合は重複して付けない", () => {
    const metadata = buildBillSeoMetadata({
      name: BILL_SEO_SITE_NAME,
    });

    expect(metadata.title).toBe(BILL_SEO_SITE_NAME);
  });
});

describe("SEO文字列ユーティリティ", () => {
  it("改行や連続空白を1つの空白にまとめる", () => {
    expect(normalizeSeoText("  防災\n\n 対策\tの概要  ")).toBe(
      "防災 対策 の概要"
    );
  });

  it("Unicodeコードポイント単位で文字数を数える", () => {
    expect(countSeoCharacters("防災☔")).toBe(3);
  });
});
