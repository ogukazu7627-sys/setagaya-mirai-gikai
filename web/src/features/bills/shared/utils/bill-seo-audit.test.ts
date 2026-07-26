import { describe, expect, it } from "vitest";
import {
  auditBillSeoRecords,
  BILL_SEO_AUDIT_LIMITS,
  type BillSeoAuditIssueCode,
} from "./bill-seo-audit";

function issueCodes(
  result: ReturnType<typeof auditBillSeoRecords>,
  index = 0
): BillSeoAuditIssueCode[] {
  return result.entries[index]?.issues.map((issue) => issue.code) ?? [];
}

describe("auditBillSeoRecords", () => {
  it("固有のタイトルと適切な長さのsummaryがあれば問題なしとする", () => {
    const result = auditBillSeoRecords([
      {
        id: "bill-1",
        name: "議案第1号",
        bill_content: {
          title: "災害に強いまちづくりをどう進める？",
          summary:
            "世田谷区が進める浸水対策と避難体制について、議会で示された計画や主な論点を公式資料に沿ってわかりやすく紹介します。",
        },
      },
    ]);

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.entriesWithIssues).toBe(0);
  });

  it("normal版のタイトルとsummaryの欠損を検出する", () => {
    const result = auditBillSeoRecords([
      {
        id: "bill-1",
        name: "議案第1号",
        bill_content: null,
      },
    ]);

    expect(issueCodes(result)).toEqual(
      expect.arrayContaining([
        "missing_friendly_title",
        "missing_summary",
        "description_too_short",
      ])
    );
    expect(result.errorCount).toBe(2);
  });

  it("生成後のタイトルと説明文の重複を全対象で検出する", () => {
    const records = ["bill-1", "bill-2"].map((id) => ({
      id,
      name: "同じ正式名称",
      bill_content: {
        title: "同じ読みやすい案件名",
        summary:
          "同じ説明文が設定されている公開案件を検出するため、十分な長さを持たせたテスト用の概要文です。",
      },
    }));

    const result = auditBillSeoRecords(records);

    expect(issueCodes(result, 0)).toEqual(
      expect.arrayContaining(["duplicate_title", "duplicate_description"])
    );
    expect(issueCodes(result, 1)).toEqual(
      expect.arrayContaining(["duplicate_title", "duplicate_description"])
    );
    expect(result.errorCount).toBe(4);
  });

  it("長すぎるタイトルと説明文を警告する", () => {
    const result = auditBillSeoRecords([
      {
        id: "bill-1",
        name: "議案第1号",
        bill_content: {
          title: "案".repeat(BILL_SEO_AUDIT_LIMITS.titleMax),
          summary: "説".repeat(BILL_SEO_AUDIT_LIMITS.descriptionMax + 1),
        },
      },
    ]);

    expect(issueCodes(result)).toEqual(
      expect.arrayContaining(["title_too_long", "description_too_long"])
    );
  });
});
