import { describe, expect, it } from "vitest";
import type { BillWithContent } from "../types";
import {
  calculateRelatedBillScore,
  rankRelatedPublishedBills,
} from "./rank-related-bills";

describe("rankRelatedPublishedBills", () => {
  it("共通タグ・大分類・SEOキーワードが近い公開案件を優先する", () => {
    const bills = [
      createBill("current", {
        major_category: "防災☔",
        tagLabels: ["避難計画"],
      }),
      createBill("same-category", { major_category: "防災☔" }),
      createBill("same-tag", { tagLabels: ["避難計画"] }),
      createBill("same-keyword"),
      createBill("unrelated", { submitted_date: "2026-12-31" }),
    ];
    const keywords = new Map([
      ["current", ["避難所", "情報保障"]],
      ["same-keyword", ["避難所"]],
    ]);

    expect(
      rankRelatedPublishedBills(bills, "current", 4, keywords).map(
        (bill) => bill.id
      )
    ).toEqual(["same-tag", "same-category", "same-keyword", "unrelated"]);
  });

  it("下書き・別公開種別・重複・現在案件を除外し、同点時は日付順で安定する", () => {
    const bills = [
      createBill("current"),
      createBill("old", { submitted_date: "2026-01-01" }),
      createBill("new", { submitted_date: "2026-07-01" }),
      createBill("new", { submitted_date: "2026-07-01" }),
      createBill("draft", { publish_status: "draft" }),
      createBill("budget", { publication_category: "budget" }),
    ];

    expect(
      rankRelatedPublishedBills(bills, "current", 4).map((bill) => bill.id)
    ).toEqual(["new", "old"]);
  });

  it("委員会と会期の一致も関連度へ加算する", () => {
    const current = createBill("current", {
      diet_session_id: "session-1",
      status_note: "福祉保健常任委員会で報告済み",
    });
    const candidate = createBill("candidate", {
      diet_session_id: "session-1",
      status_note: "2026-07-01 福祉保健常任委員会",
    });

    expect(calculateRelatedBillScore(current, candidate)).toBe(8);
  });
});

function createBill(
  id: string,
  overrides: {
    major_category?: string;
    tagLabels?: string[];
    publish_status?: "draft" | "published";
    publication_category?: "report" | "budget";
    submitted_date?: string;
    diet_session_id?: string;
    status_note?: string;
  } = {}
): BillWithContent {
  return {
    id,
    name: `案件 ${id}`,
    publish_status: overrides.publish_status ?? "published",
    publication_category: overrides.publication_category ?? "report",
    submitted_date: overrides.submitted_date ?? "2026-06-01",
    major_category: overrides.major_category ?? null,
    diet_session_id: overrides.diet_session_id ?? null,
    status_note: overrides.status_note ?? null,
    tags: (overrides.tagLabels ?? []).map((label, index) => ({
      id: `${id}-${index}`,
      label,
    })),
  } as unknown as BillWithContent;
}
