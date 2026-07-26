import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "../../shared/types";
import { loadBillsDirectoryData } from "./load-bills-directory-data";

const mocks = vi.hoisted(() => ({
  getDifficultyLevel: vi.fn(),
  findDietSessionsStartingBetween: vi.fn(),
  findDietSessionsStartingBefore: vi.fn(),
  findPublishedBillsByDietSessionIds: vi.fn(),
  buildBillsWithContent: vi.fn(),
  loadYearArchiveData: vi.fn(),
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
    findDietSessionsStartingBefore: mocks.findDietSessionsStartingBefore,
  })
);

vi.mock("@/lib/setagaya-mock", () => ({
  getSetagayaMockBills: vi.fn(),
  isSetagayaMockMode: false,
}));

vi.mock("../repositories/bill-repository", () => ({
  findPublishedBillsByDietSessionIds: mocks.findPublishedBillsByDietSessionIds,
}));

vi.mock("../utils/build-bills-with-content", () => ({
  buildBillsWithContent: mocks.buildBillsWithContent,
}));

vi.mock("./load-year-archive-data", () => ({
  loadYearArchiveData: mocks.loadYearArchiveData,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDifficultyLevel.mockResolvedValue("normal");
  mocks.findDietSessionsStartingBetween.mockResolvedValue([
    { id: "session-2026" },
  ]);
  mocks.findDietSessionsStartingBefore.mockResolvedValue([
    { id: "session-2025", start_date: "2025-06-01" },
  ]);
  mocks.findPublishedBillsByDietSessionIds.mockResolvedValue([
    { id: "current-bill-row" },
  ]);
  mocks.loadYearArchiveData.mockResolvedValue({
    years: [2025],
    selectedYear: 2025,
    billsByMajorCategory: [],
  });
  mocks.buildBillsWithContent.mockResolvedValue([
    {
      id: "bill-2026",
      diet_session_id: "session-2026",
      item_type: "bill",
      major_category: "教育🏫",
      submitted_date: "2026-05-01",
      thumbnail_url: "https://example.com/bill-2026.jpg",
      status: "introduced",
      status_label: null,
      status_note: "文教常任委員会で審査",
      is_featured: false,
      is_review_completed: true,
      interview_enabled: false,
      hasPublicInterview: false,
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
  it("uses the current-year bills for themes, search, and AI context", async () => {
    const result = await loadBillsDirectoryData(
      new Date("2026-07-26T12:00:00+09:00"),
      "2025"
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
    expect(mocks.findDietSessionsStartingBefore).toHaveBeenCalledWith(
      "2026-01-01"
    );
    expect(mocks.loadYearArchiveData).toHaveBeenCalledWith({
      archiveYear: "2025",
      difficultyLevel: "normal",
      pastSessions: [{ id: "session-2025", start_date: "2025-06-01" }],
    });
    expect(mocks.buildBillsWithContent).toHaveBeenCalledWith([
      { id: "current-bill-row" },
    ]);
    expect(result.billsByMajorCategory).toHaveLength(1);
    expect(result.billsByMajorCategory[0]?.bills[0]?.id).toBe("bill-2026");
    expect(result.currentBills.map(({ id }) => id)).toEqual(["bill-2026"]);
    expect(result.searchDocuments).toHaveLength(1);
    expect(result.searchDocuments.map(({ id }) => id)).toEqual(["bill-2026"]);
    expect(result.searchDocuments[0]?.thumbnailUrl).toBe(
      "https://example.com/bill-2026.jpg"
    );
    expect(
      result.searchDocuments[0]?.kind === "bill"
        ? result.searchDocuments[0].card.id
        : null
    ).toBe("bill-2026");
    expect(result.archiveData.selectedYear).toBe(2025);
    expect(result.difficultyLevel).toBe("normal");
  });
});
