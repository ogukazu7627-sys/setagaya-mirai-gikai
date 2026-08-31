import { describe, expect, it, vi } from "vitest";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { CouncilBillCardRow } from "../repositories/council-bill-directory-repository";
import { loadCouncilBillCardsByIds } from "./load-council-bill-cards";

describe("loadCouncilBillCardsByIds", () => {
  it("本文なしの一覧行をカード化し、検索順どおりに返す", async () => {
    const findRows = vi
      .fn()
      .mockResolvedValue([createRow("bill-2"), createRow("bill-1")]);
    const findTags = vi.fn().mockResolvedValue(
      new Map([
        ["bill-1", [{ id: "tag-1", label: "学校" }]],
        ["bill-2", []],
      ])
    );
    const findInterviewBillIds = vi.fn().mockResolvedValue(new Set(["bill-2"]));

    const cards = await loadCouncilBillCardsByIds(
      ["bill-1", "bill-2"],
      ["session-1"],
      "normal" as DifficultyLevelEnum,
      { findRows, findTags, findInterviewBillIds }
    );

    expect(findRows).toHaveBeenCalledWith(
      ["bill-1", "bill-2"],
      ["session-1"],
      "normal"
    );
    expect(cards.map(({ id }) => id)).toEqual(["bill-1", "bill-2"]);
    expect(cards[0]?.bill_content).toEqual({
      title: "bill-1のタイトル",
      summary: "bill-1の概要",
    });
    expect(cards[0]?.tags).toEqual([{ id: "tag-1", label: "学校" }]);
    expect(cards[1]?.hasPublicInterview).toBe(true);
    expect(cards[0]?.bill_content).not.toHaveProperty("content");
  });
});

function createRow(id: string): CouncilBillCardRow {
  return {
    id,
    name: `${id}の正式名称`,
    item_type: "bill",
    publication_category: "report",
    major_category: "教育🏫",
    status: "introduced",
    status_label: null,
    status_note: "文教常任委員会で審査",
    submitted_date: "2026-07-01",
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: true,
    interview_enabled: false,
    bill_contents: {
      title: `${id}のタイトル`,
      summary: `${id}の概要`,
    },
  };
}
