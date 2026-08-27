import { describe, expect, it, vi } from "vitest";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import type { BillCardData } from "../../shared/types";
import type { CouncilBillDirectoryEntry } from "../../shared/types/council-bill-directory";
import { loadCouncilBillPage } from "./council-bill-page-service";

const session = { id: "session-2026" } as DietSession;

describe("loadCouncilBillPage", () => {
  it("フィルター結果を今年の案件から5件ずつ返す", async () => {
    const entries = Array.from({ length: 7 }, (_, index) =>
      createEntry(`bill-${index + 1}`)
    );
    const loadCards = vi.fn(async (billIds: string[]) =>
      billIds.map(createCard)
    );
    const findSessions = vi.fn().mockResolvedValue([session]);

    const result = await loadCouncilBillPage(
      {
        installationId: "11111111-1111-4111-8111-111111111111",
        mode: "filters",
        contentType: "report",
        themeId: "education",
        committeeName: "文教常任委員会",
        page: 2,
      },
      {
        now: () => new Date("2026-07-27T12:00:00+09:00"),
        getDifficulty: async () => "normal",
        findSessions,
        findEntries: async () => entries,
        findGeneralQuestionCategories: async () => [],
        loadCards,
      }
    );

    expect(findSessions).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
    expect(loadCards).toHaveBeenCalledWith(
      ["bill-2", "bill-1"],
      [session.id],
      "normal"
    );
    expect(result).toEqual({
      bills: [createCard("bill-2"), createCard("bill-1")],
      items: [
        { kind: "bill", bill: createCard("bill-2") },
        { kind: "bill", bill: createCard("bill-1") },
      ],
      total: 7,
      currentPage: 2,
      totalPages: 2,
    });
  });

  it("テーマ一覧を指定年の案件から10件ずつ返す", async () => {
    const entries = Array.from({ length: 12 }, (_, index) =>
      createEntry(`bill-${index + 1}`)
    );
    const loadCards = vi.fn(async (billIds: string[]) =>
      billIds.map(createCard)
    );

    const result = await loadCouncilBillPage(
      {
        installationId: "11111111-1111-4111-8111-111111111111",
        mode: "theme",
        year: 2025,
        themeId: "education",
        page: 1,
      },
      {
        now: () => new Date("2026-07-27T12:00:00+09:00"),
        getDifficulty: async () => "normal",
        findSessions: async () => [{ id: "session-2025" } as DietSession],
        findEntries: async () => entries,
        findGeneralQuestionCategories: async () => [],
        loadCards,
      }
    );

    expect(result.bills).toHaveLength(10);
    expect(result.total).toBe(12);
    expect(result.totalPages).toBe(2);
  });
});

function createEntry(id: string): CouncilBillDirectoryEntry {
  const index = Number(id.split("-")[1]);
  return {
    id,
    itemType: "report",
    majorCategory: "教育🏫",
    committeeName: "文教常任委員会",
    submittedDate: `2026-07-${String(index).padStart(2, "0")}`,
  };
}

function createCard(id: string): BillCardData {
  return {
    id,
    name: id,
    item_type: "report",
    major_category: "教育🏫",
    status: "introduced",
    status_label: null,
    status_note: "文教常任委員会で報告",
    submitted_date: "2026-07-01",
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: true,
    interview_enabled: false,
    hasPublicInterview: false,
    bill_content: { title: id, summary: id },
    tags: [],
  };
}
