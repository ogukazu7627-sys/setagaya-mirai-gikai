import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedBudgetQuestion } from "../../shared/types/budget-question";
import {
  loadBudgetQuestionCategoryPage,
  loadBudgetQuestionMapGroups,
} from "./load-budget-questions";

const repositoryMock = vi.hoisted(() => ({
  findPublishedBudgetQuestions: vi.fn(),
}));

vi.mock("../repositories/budget-question-repository", () => repositoryMock);

function createQuestion(
  id: string,
  overrides: Partial<PublishedBudgetQuestion> = {}
): PublishedBudgetQuestion {
  return {
    id,
    name: `予算質問 ${id}`,
    categorySlug: "education",
    majorCategory: "教育🏫",
    submittedDate: "2026-08-01",
    publishedAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    dietSession: null,
    partyOrGroup: "会派名",
    councilor: {
      id: `councilor-${id}`,
      displayName: `議員 ${id}`,
      iconUrl: `/icons/councilors/${id}.jpg`,
    },
    contents: {
      normal: {
        difficultyLevel: "normal",
        title: `normal ${id}`,
        summary: "normal summary",
        content: "# normal",
      },
      hard: {
        difficultyLevel: "hard",
        title: `hard ${id}`,
        summary: "hard summary",
        content: "# hard",
      },
    },
    ...overrides,
  };
}

describe("loadBudgetQuestionCategoryPage", () => {
  beforeEach(() => {
    repositoryMock.findPublishedBudgetQuestions.mockReset();
  });

  it("不正な大分類slugはnullにする", async () => {
    const result = await loadBudgetQuestionCategoryPage({
      categorySlug: "unknown",
      difficultyLevel: "normal",
    });

    expect(result).toBeNull();
    expect(repositoryMock.findPublishedBudgetQuestions).not.toHaveBeenCalled();
  });

  it("対象大分類だけを新しい順で取得する", async () => {
    repositoryMock.findPublishedBudgetQuestions.mockResolvedValue([
      createQuestion("older", { submittedDate: "2026-07-01" }),
      createQuestion("focused", { submittedDate: "2026-06-01" }),
      createQuestion("other", {
        categorySlug: "welfare",
        majorCategory: "福祉🤝",
      }),
    ]);

    const result = await loadBudgetQuestionCategoryPage({
      categorySlug: "education",
      difficultyLevel: "normal",
    });

    expect(result?.questions.map((question) => question.id)).toEqual([
      "older",
      "focused",
    ]);
    expect(result?.questions[1]?.selectedContent.title).toBe("normal focused");
  });

  it("hard版がない案件はnormal版を表示する", async () => {
    repositoryMock.findPublishedBudgetQuestions.mockResolvedValue([
      createQuestion("normal-only", {
        contents: {
          normal: {
            difficultyLevel: "normal",
            title: "normal fallback",
            summary: "normal summary",
            content: "# normal",
          },
        },
      }),
    ]);

    const result = await loadBudgetQuestionCategoryPage({
      categorySlug: "education",
      difficultyLevel: "hard",
    });

    expect(result?.questions[0]?.selectedContent.title).toBe("normal fallback");
  });
});

describe("loadBudgetQuestionMapGroups", () => {
  beforeEach(() => {
    repositoryMock.findPublishedBudgetQuestions.mockReset();
  });

  it("取得失敗時は予算ページを落とさず空の衛星で継続する", async () => {
    repositoryMock.findPublishedBudgetQuestions.mockRejectedValue(
      new Error("database unavailable")
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await loadBudgetQuestionMapGroups(
      new Date("2026-08-17T03:00:00.000Z")
    );

    expect(result.all).toEqual([]);
    expect(result.education).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
