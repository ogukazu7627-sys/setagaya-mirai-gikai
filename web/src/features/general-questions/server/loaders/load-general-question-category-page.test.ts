import { describe, expect, it, vi } from "vitest";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import type { PublishedGeneralQuestion } from "../../shared/types/general-question";
import { loadGeneralQuestionCategoryPage } from "./load-general-question-category-page";

describe("loadGeneralQuestionCategoryPage", () => {
  it("指定年と大分類だけを取得し、難易度に応じた本文を新しい順で返す", async () => {
    const findSessions = vi
      .fn()
      .mockResolvedValue([{ id: "session-2026" } as DietSession]);
    const findQuestions = vi.fn().mockResolvedValue([
      createQuestion("older", "2026-02-18", {
        normal: createContent("normal", "やさしい本文"),
      }),
      createQuestion("newer", "2026-02-20", {
        normal: createContent("normal", "通常本文"),
        hard: createContent("hard", "詳しい本文"),
      }),
      createQuestion("without-content", "2026-02-19", {}),
    ]);

    const result = await loadGeneralQuestionCategoryPage(
      {
        categoryId: "education",
        year: 2026,
        difficultyLevel: "hard",
      },
      { findSessions, findQuestions }
    );

    expect(findSessions).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
    expect(findQuestions).toHaveBeenCalledWith({
      dietSessionIds: ["session-2026"],
      majorCategory: "教育🏫",
    });
    expect(result?.questions.map(({ id }) => id)).toEqual(["newer", "older"]);
    expect(result?.questions[0].selectedContent.content).toBe("詳しい本文");
    expect(result?.questions[1].selectedContent.content).toBe("やさしい本文");
  });
});

function createContent(difficultyLevel: "normal" | "hard", content: string) {
  return {
    difficultyLevel,
    title: `${content}の題名`,
    summary: `${content}の概要`,
    content,
  };
}

function createQuestion(
  id: string,
  submittedDate: string,
  contents: PublishedGeneralQuestion["contents"]
): PublishedGeneralQuestion {
  return {
    id,
    name: id,
    categoryId: "education",
    majorCategory: "教育🏫",
    submittedDate,
    publishedAt: `${submittedDate}T00:00:00.000Z`,
    updatedAt: `${submittedDate}T00:00:00.000Z`,
    dietSession: { id: "session-2026", name: "第1回定例会", slug: null },
    partyOrGroup: "会派名",
    councilor: {
      id: `councilor-${id}`,
      displayName: id,
      iconUrl: null,
    },
    contents,
  };
}
