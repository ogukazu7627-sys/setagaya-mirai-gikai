import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "../../shared/types";
import { loadBillsDirectoryData } from "./load-bills-directory-data";

const mocks = vi.hoisted(() => ({
  getDifficultyLevel: vi.fn(),
  findDietSessionsStartingBetween: vi.fn(),
  findPublishedBillsByDietSessionIds: vi.fn(),
  findPublishedBillSearchRows: vi.fn(),
  buildBillsWithContent: vi.fn(),
}));

vi.mock(
  "@/features/bill-difficulty/server/loaders/get-difficulty-level",
  () => ({
    getDifficultyLevel: mocks.getDifficultyLevel,
  })
);

vi.mock(
  "@/features/diet-sessions/server/repositories/diet-session-repository",
  () => ({
    findDietSessionsStartingBetween: mocks.findDietSessionsStartingBetween,
  })
);

vi.mock("@/lib/setagaya-mock", () => ({
  getSetagayaMockBills: vi.fn(),
  isSetagayaMockMode: false,
}));

vi.mock("../repositories/bill-repository", () => ({
  findPublishedBillsByDietSessionIds: mocks.findPublishedBillsByDietSessionIds,
  findPublishedBillSearchRows: mocks.findPublishedBillSearchRows,
}));

vi.mock("../utils/build-bills-with-content", () => ({
  buildBillsWithContent: mocks.buildBillsWithContent,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDifficultyLevel.mockResolvedValue("normal");
  mocks.findDietSessionsStartingBetween.mockResolvedValue([
    { id: "session-2026" },
  ]);
  mocks.findPublishedBillsByDietSessionIds.mockResolvedValue([
    { id: "current-bill-row" },
  ]);
  mocks.findPublishedBillSearchRows.mockResolvedValue([
    {
      id: "bill-2026",
      name: "令和8年の議案",
      thumbnail_url: "https://example.com/bill-2026.jpg",
      item_type: "bill",
      major_category: "教育🏫",
      status_note: "文教常任委員会で審査",
      submitted_date: "2026-05-01",
      bill_contents: {
        title: "令和8年の学校に関する議案",
        summary: "学校に関する議案です。",
      },
      bills_tags: [],
    },
    {
      id: "bill-2025",
      name: "令和7年の報告",
      thumbnail_url: null,
      item_type: "report",
      major_category: "福祉🤝",
      status_note: "福祉保健常任委員会で報告",
      submitted_date: "2025-11-01",
      bill_contents: {
        title: "令和7年の福祉に関する報告",
        summary: "福祉に関する報告です。",
      },
      bills_tags: [],
    },
  ]);
  mocks.buildBillsWithContent.mockResolvedValue([
    {
      id: "bill-2026",
      diet_session_id: "session-2026",
      item_type: "bill",
      major_category: "教育🏫",
      submitted_date: "2026-05-01",
      name: "令和8年の議案",
      bill_content: {
        title: "令和8年の学校に関する議案",
        summary: "学校に関する議案です。",
      },
      tags: [],
    } as unknown as BillWithContent,
  ]);
});

describe("loadBillsDirectoryData", () => {
  it("groups the current year while building a search index from all public bills", async () => {
    const result = await loadBillsDirectoryData(
      new Date("2026-07-26T12:00:00+09:00")
    );

    expect(mocks.findDietSessionsStartingBetween).toHaveBeenCalledOnce();
    expect(mocks.findDietSessionsStartingBetween).toHaveBeenCalledWith(
      "2026-01-01",
      "2026-12-31"
    );
    expect(mocks.findPublishedBillsByDietSessionIds).toHaveBeenCalledWith(
      ["session-2026"],
      "normal"
    );
    expect(mocks.findPublishedBillSearchRows).toHaveBeenCalledWith("normal");
    expect(mocks.buildBillsWithContent).toHaveBeenCalledWith([
      { id: "current-bill-row" },
    ]);
    expect(result.billsByMajorCategory).toHaveLength(1);
    expect(result.billsByMajorCategory[0]?.bills[0]?.id).toBe("bill-2026");
    expect(result.searchDocuments).toHaveLength(2);
    expect(result.searchDocuments.map(({ id }) => id)).toEqual([
      "bill-2026",
      "bill-2025",
    ]);
    expect(result.searchDocuments[0]?.thumbnailUrl).toBe(
      "https://example.com/bill-2026.jpg"
    );
    expect(result.difficultyLevel).toBe("normal");
  });
});
