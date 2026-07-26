import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "../../shared/types";
import { loadYearArchiveData } from "./load-year-archive-data";

const mocks = vi.hoisted(() => ({
  findDietSessionsStartingBetween: vi.fn(),
  findPublishedBillsByDietSessionIds: vi.fn(),
  buildBillsWithContent: vi.fn(),
}));

vi.mock(
  "@/features/diet-sessions/server/repositories/diet-session-repository",
  () => ({
    findDietSessionsStartingBetween: mocks.findDietSessionsStartingBetween,
  })
);

vi.mock("../repositories/bill-repository", () => ({
  findPublishedBillsByDietSessionIds: mocks.findPublishedBillsByDietSessionIds,
}));

vi.mock("../utils/build-bills-with-content", () => ({
  buildBillsWithContent: mocks.buildBillsWithContent,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findDietSessionsStartingBetween.mockResolvedValue([
    { id: "session-2024" },
  ]);
  mocks.findPublishedBillsByDietSessionIds.mockResolvedValue([
    { id: "archive-row" },
  ]);
  mocks.buildBillsWithContent.mockResolvedValue([
    {
      id: "archive-bill",
      major_category: "教育🏫",
      submitted_date: "2024-06-01",
    } as unknown as BillWithContent,
  ]);
});

describe("loadYearArchiveData", () => {
  it("selects the requested past year and loads only its sessions", async () => {
    const result = await loadYearArchiveData({
      archiveYear: "2024",
      difficultyLevel: "normal",
      pastSessions: [
        { start_date: "2025-02-01" },
        { start_date: "2024-06-01" },
        { start_date: "2025-09-01" },
      ],
    });

    expect(result.years).toEqual([2025, 2024]);
    expect(result.selectedYear).toBe(2024);
    expect(mocks.findDietSessionsStartingBetween).toHaveBeenCalledWith(
      "2024-01-01",
      "2024-12-31"
    );
    expect(mocks.findPublishedBillsByDietSessionIds).toHaveBeenCalledWith(
      ["session-2024"],
      "normal"
    );
    expect(result.billsByMajorCategory[0]?.bills[0]?.id).toBe("archive-bill");
  });

  it("returns an empty archive without querying bills when no past year exists", async () => {
    const result = await loadYearArchiveData({
      difficultyLevel: "normal",
      pastSessions: [],
    });

    expect(result).toEqual({
      years: [],
      selectedYear: null,
      billsByMajorCategory: [],
    });
    expect(mocks.findDietSessionsStartingBetween).not.toHaveBeenCalled();
    expect(mocks.findPublishedBillsByDietSessionIds).not.toHaveBeenCalled();
  });
});
