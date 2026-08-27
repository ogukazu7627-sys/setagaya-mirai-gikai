import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadYearArchiveData } from "./load-year-archive-data";

const mocks = vi.hoisted(() => ({
  findDietSessionsStartingBetween: vi.fn(),
  findEntries: vi.fn(),
  findGeneralQuestionCategories: vi.fn(),
  loadCouncilThemeSectionData: vi.fn(),
}));

vi.mock(
  "@/features/diet-sessions/server/repositories/diet-session-repository",
  () => ({
    findDietSessionsStartingBetween: mocks.findDietSessionsStartingBetween,
  })
);
vi.mock("../repositories/council-bill-directory-repository", () => ({
  findPublishedCouncilBillDirectoryEntries: mocks.findEntries,
}));
vi.mock(
  "@/features/general-questions/server/repositories/general-question-repository",
  () => ({
    findPublishedGeneralQuestionCategoryCards:
      mocks.findGeneralQuestionCategories,
  })
);
vi.mock("./load-council-theme-section-data", () => ({
  loadCouncilThemeSectionData: mocks.loadCouncilThemeSectionData,
}));

const themeData = {
  year: 2024,
  categories: [],
  initialCategoryId: null,
  initialPage: {
    bills: [],
    items: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findDietSessionsStartingBetween.mockResolvedValue([
    { id: "session-2024" },
  ]);
  mocks.findEntries.mockResolvedValue([{ id: "archive-entry" }]);
  mocks.findGeneralQuestionCategories.mockResolvedValue([
    {
      categoryId: "education",
      name: "教育",
      majorCategory: "教育🏫",
      description: "教育に関する質問",
      year: 2024,
      questionCount: 12,
      latestSubmittedDate: "2024-06-01",
    },
  ]);
  mocks.loadCouncilThemeSectionData.mockResolvedValue(themeData);
});

describe("loadYearArchiveData", () => {
  it("選ばれた過去年だけを軽量索引と10件ページで読み込む", async () => {
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
    expect(mocks.findEntries).toHaveBeenCalledWith(["session-2024"], "normal");
    expect(mocks.findGeneralQuestionCategories).toHaveBeenCalledWith(
      ["session-2024"],
      2024
    );
    expect(mocks.loadCouncilThemeSectionData).toHaveBeenCalledWith({
      year: 2024,
      entries: [
        { id: "archive-entry" },
        expect.objectContaining({
          kind: "general-question-category",
          id: "general-question:2024:education",
        }),
      ],
      dietSessionIds: ["session-2024"],
      difficultyLevel: "normal",
    });
    expect(result.themeData).toBe(themeData);
  });

  it("年を選ぶまでは過年度案件を取得しない", async () => {
    const result = await loadYearArchiveData({
      difficultyLevel: "normal",
      pastSessions: [
        { start_date: "2025-02-01" },
        { start_date: "2024-06-01" },
      ],
    });

    expect(result).toEqual({
      years: [2025, 2024],
      selectedYear: null,
      themeData: null,
    });
    expect(mocks.findDietSessionsStartingBetween).not.toHaveBeenCalled();
    expect(mocks.findEntries).not.toHaveBeenCalled();
    expect(mocks.findGeneralQuestionCategories).not.toHaveBeenCalled();
  });

  it("過年度がない場合は空の年一覧を返す", async () => {
    expect(
      await loadYearArchiveData({
        difficultyLevel: "normal",
        pastSessions: [],
      })
    ).toEqual({
      years: [],
      selectedYear: null,
      themeData: null,
    });
  });
});
