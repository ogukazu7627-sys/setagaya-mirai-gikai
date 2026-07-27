import { describe, expect, it, vi } from "vitest";
import type { BillCardData } from "../../shared/types";
import type { CouncilBillDirectoryEntry } from "../../shared/types/council-bill-directory";
import { loadCouncilThemeSectionData } from "./load-council-theme-section-data";

describe("loadCouncilThemeSectionData", () => {
  it("全件索引から初期表示に必要な10件だけをカード取得する", async () => {
    const entries = Array.from({ length: 25 }, (_, index) =>
      createEntry(index + 1)
    );
    const loadCards = vi.fn(async (billIds: string[]) =>
      billIds.map(createCard)
    );

    const result = await loadCouncilThemeSectionData(
      {
        year: 2026,
        entries,
        dietSessionIds: ["session-2026"],
        difficultyLevel: "normal",
      },
      { loadCards }
    );

    expect(loadCards).toHaveBeenCalledOnce();
    expect(loadCards.mock.calls[0]?.[0]).toHaveLength(10);
    expect(result.initialPage.bills).toHaveLength(10);
    expect(result.initialPage.total).toBe(25);
    expect(result.initialPage.totalPages).toBe(3);
    expect(result.categories).toHaveLength(1);
  });
});

function createEntry(index: number): CouncilBillDirectoryEntry {
  return {
    id: `bill-${index}`,
    itemType: "bill",
    majorCategory: "教育🏫",
    committeeName: "文教常任委員会",
    submittedDate: `2026-07-${String(index).padStart(2, "0")}`,
  };
}

function createCard(id: string): BillCardData {
  return {
    id,
    name: id,
    item_type: "bill",
    major_category: "教育🏫",
    status: "introduced",
    status_label: null,
    status_note: null,
    submitted_date: "2026-07-01",
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: true,
    interview_enabled: false,
    hasPublicInterview: false,
    bill_content: null,
    tags: [],
  };
}
