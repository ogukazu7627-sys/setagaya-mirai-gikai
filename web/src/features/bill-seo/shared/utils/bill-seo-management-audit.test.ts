import { describe, expect, it } from "vitest";
import type { BillSeoProfile } from "../types";
import { auditManagedBillSeoEntries } from "./bill-seo-management-audit";

describe("auditManagedBillSeoEntries", () => {
  it("未生成、古いhash、重複を検出する", () => {
    const profile = createProfile();
    const entries = auditManagedBillSeoEntries([
      {
        id: "1",
        name: "案件1",
        publishStatus: "published",
        currentSourceHash: "new-hash",
        faqCount: 2,
        profile,
      },
      {
        id: "2",
        name: "案件2",
        publishStatus: "draft",
        currentSourceHash: "hash",
        faqCount: 0,
        profile: { ...profile, billId: "2" },
      },
      {
        id: "3",
        name: "案件3",
        publishStatus: "draft",
        currentSourceHash: "hash",
        faqCount: 0,
        profile: null,
      },
    ]);

    expect(entries[0]?.issues.map((issue) => issue.code)).toContain("stale");
    expect(entries[0]?.issues.map((issue) => issue.code)).toContain(
      "duplicate_title"
    );
    expect(entries[2]?.issues.map((issue) => issue.code)).toEqual(["missing"]);
  });
});

function createProfile(): BillSeoProfile {
  return {
    billId: "1",
    seoTitle: "学校改築の計画",
    seoDescription:
      "世田谷区の学校改築計画について、工事の予定や教育環境への影響、議会で確認された重要な論点を分かりやすく紹介します。",
    seoKeywords: ["学校改築", "教育環境", "世田谷区議会"],
    status: "ready",
    sourceHash: "hash",
    generatedAt: "2026-08-29T00:00:00.000Z",
    generationStartedAt: null,
    model: "openai/gpt-5.6-luna",
    lastError: null,
    updatedAt: "2026-08-29T00:00:00.000Z",
  };
}
