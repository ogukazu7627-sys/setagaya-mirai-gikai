import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "../../shared/types";
import { loadBillsDirectoryData } from "./load-bills-directory-data";

const mocks = vi.hoisted(() => ({
  getDifficultyLevel: vi.fn(),
  findDietSessionsStartingBetween: vi.fn(),
  findPublishedBillsByDietSessionIds: vi.fn(),
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
  getSetagayaMockBillsByMajorCategory: vi.fn(),
  isSetagayaMockMode: false,
}));

vi.mock("../repositories/bill-repository", () => ({
  findPublishedBillsByDietSessionIds: mocks.findPublishedBillsByDietSessionIds,
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
    { id: "bill-row" },
  ]);
  mocks.buildBillsWithContent.mockResolvedValue([
    {
      id: "bill-2026",
      item_type: "bill",
      major_category: "教育🏫",
      submitted_date: "2026-05-01",
      tags: [],
    } as unknown as BillWithContent,
  ]);
});

describe("loadBillsDirectoryData", () => {
  it("fetches only public bills in sessions that started during the current calendar year", async () => {
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
    expect(mocks.buildBillsWithContent).toHaveBeenCalledWith([
      { id: "bill-row" },
    ]);
    expect(result.billsByMajorCategory).toHaveLength(1);
    expect(result.billsByMajorCategory[0]?.bills[0]?.id).toBe("bill-2026");
  });
});
