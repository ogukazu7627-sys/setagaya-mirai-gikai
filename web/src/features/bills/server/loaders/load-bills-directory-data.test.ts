import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBillsDirectoryData } from "./load-bills-directory-data";

const mocks = vi.hoisted(() => ({
  getDifficultyLevel: vi.fn(),
  findDietSessionsStartingBetween: vi.fn(),
  findDietSessionsStartingBefore: vi.fn(),
  findEntries: vi.fn(),
  findGeneralQuestionCategories: vi.fn(),
  loadCouncilThemeSectionData: vi.fn(),
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
vi.mock("./load-year-archive-data", () => ({
  loadYearArchiveData: mocks.loadYearArchiveData,
}));

const themeData = {
  year: 2026,
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
  mocks.getDifficultyLevel.mockResolvedValue("normal");
  mocks.findDietSessionsStartingBetween.mockResolvedValue([
    { id: "session-2026" },
  ]);
  mocks.findDietSessionsStartingBefore.mockResolvedValue([
    { id: "session-2025", start_date: "2025-06-01" },
  ]);
  mocks.findEntries.mockResolvedValue([{ id: "current-bill" }]);
  mocks.findGeneralQuestionCategories.mockResolvedValue([
    {
      categoryId: "education",
      name: "教育",
      majorCategory: "教育🏫",
      description: "教育に関する質問",
      year: 2026,
      dietSession: {
        id: "session-2026",
        name: "令和8年第1回定例会",
        slug: "2026-1",
        startDate: "2026-02-01",
      },
      questionCount: 30,
      latestSubmittedDate: "2026-02-20",
    },
  ]);
  mocks.loadCouncilThemeSectionData.mockResolvedValue(themeData);
  mocks.loadYearArchiveData.mockResolvedValue({
    years: [2025],
    selectedYear: null,
    themeData: null,
  });
});

describe("loadBillsDirectoryData", () => {
  it("今年の軽量索引から初期テーマページを構築する", async () => {
    const result = await loadBillsDirectoryData(
      new Date("2026-07-26T12:00:00+09:00")
    );

    expect(mocks.findDietSessionsStartingBetween).toHaveBeenCalledWith(
      "2026-01-01",
      "2026-12-31"
    );
    expect(mocks.findEntries).toHaveBeenCalledWith(["session-2026"], "normal");
    expect(mocks.findGeneralQuestionCategories).toHaveBeenCalledWith(
      ["session-2026"],
      2026
    );
    expect(mocks.loadCouncilThemeSectionData).toHaveBeenCalledWith({
      year: 2026,
      entries: [
        { id: "current-bill" },
        expect.objectContaining({
          kind: "general-question-category",
          id: "general-question:session-2026:education",
          itemType: "question",
          majorCategory: "教育🏫",
        }),
      ],
      dietSessionIds: ["session-2026"],
      difficultyLevel: "normal",
    });
    expect(mocks.loadYearArchiveData).toHaveBeenCalledWith({
      archiveYear: undefined,
      difficultyLevel: "normal",
      pastSessions: [{ id: "session-2025", start_date: "2025-06-01" }],
    });
    expect(result).toEqual({
      themeData,
      difficultyLevel: "normal",
      archiveData: {
        years: [2025],
        selectedYear: null,
        themeData: null,
      },
    });
    expect(result).not.toHaveProperty("searchDocuments");
    expect(result).not.toHaveProperty("currentBills");
  });
});
