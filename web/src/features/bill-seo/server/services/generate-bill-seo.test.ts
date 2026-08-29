import { describe, expect, it } from "vitest";
import type { BillSeoSourceData } from "../../shared/types";
import {
  createBillSeoSourceHash,
  getTokyoDayStartIso,
} from "../../shared/utils/bill-seo-source";

describe("bill SEO service utilities", () => {
  it("タグと出典の並び順が変わっても同じhashになる", () => {
    const source = createSource();
    const reordered = {
      ...source,
      tags: [...source.tags].reverse(),
      sources: [...source.sources].reverse(),
    };

    expect(createBillSeoSourceHash(source)).toBe(
      createBillSeoSourceHash(reordered)
    );
  });

  it("東京時間の日付開始をUTC ISOへ変換する", () => {
    expect(getTokyoDayStartIso(new Date("2026-08-29T15:30:00.000Z"))).toBe(
      "2026-08-29T15:00:00.000Z"
    );
  });
});

function createSource(): BillSeoSourceData {
  return {
    billId: "11111111-1111-4111-8111-111111111111",
    formalName: "正式名称",
    itemType: "report",
    majorCategory: "教育🏫",
    submittedDate: "2026-08-29",
    statusLabel: "報告済み",
    statusNote: "文教常任委員会で報告",
    dietSessionName: "令和8年第3回定例会",
    normalTitle: "学校改築について",
    normalSummary: "学校改築の計画を説明します。",
    normalContent: "# 具体的な内容\n\n本文",
    tags: ["学校改築", "小学校"],
    sources: [
      { title: "資料B", source_type: "official_page", url: "https://b" },
      { title: "資料A", source_type: "official_page", url: "https://a" },
    ],
  };
}
