import { describe, expect, it } from "vitest";
import type { BillCardData } from "@/features/bills/shared/types";
import type { GeneralQuestionCategoryCardData } from "../types/general-question";
import { groupGeneralQuestionSearchResults } from "./group-general-question-search-results";

describe("groupGeneralQuestionSearchResults", () => {
  it("検索順を保ちながら同じ大分類の一般質問を1枚に畳む", () => {
    const reportFirst = createCard("report-first", "report", "教育🏫");
    const educationFirst = createCard(
      "education-first",
      "general_question",
      "教育🏫"
    );
    const educationSecond = createCard(
      "education-second",
      "general_question",
      "教育🏫"
    );
    const disaster = createCard("disaster", "general_question", "防災☔");

    const items = groupGeneralQuestionSearchResults(
      [reportFirst, educationFirst, educationSecond, disaster],
      [
        createCategory("education", "教育", "教育🏫", 30),
        createCategory("disaster-prevention", "防災", "防災☔", 12),
      ],
      2026
    );

    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ kind: "bill", bill: reportFirst });
    expect(items[1]).toMatchObject({
      kind: "general-question-category",
      category: {
        categoryId: "education",
        questionCount: 30,
        focusBillId: "education-first",
      },
    });
    expect(items[2]).toMatchObject({
      kind: "general-question-category",
      category: {
        categoryId: "disaster-prevention",
        questionCount: 12,
        focusBillId: "disaster",
      },
    });
  });

  it("集計カードがなくても検索一致分から安全に1枚を作る", () => {
    const question = createCard(
      "education-question",
      "general_question",
      "教育🏫"
    );

    expect(groupGeneralQuestionSearchResults([question], [], 2026)).toEqual([
      expect.objectContaining({
        kind: "general-question-category",
        category: expect.objectContaining({
          categoryId: "education",
          questionCount: 1,
          focusBillId: question.id,
          year: 2026,
        }),
      }),
    ]);
  });
});

function createCard(
  id: string,
  publicationCategory: "report" | "general_question",
  majorCategory: string
): BillCardData {
  return {
    id,
    name: id,
    item_type:
      publicationCategory === "general_question" ? "question" : "report",
    publication_category: publicationCategory,
    major_category: majorCategory,
    status: "introduced",
    status_label: null,
    status_note: null,
    submitted_date: "2026-02-20",
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: true,
    interview_enabled: false,
    hasPublicInterview: false,
    bill_content: { title: id, summary: id },
    tags: [],
  };
}

function createCategory(
  categoryId: GeneralQuestionCategoryCardData["categoryId"],
  name: string,
  majorCategory: string,
  questionCount: number
): GeneralQuestionCategoryCardData {
  return {
    categoryId,
    name,
    majorCategory,
    description: `${name}の説明`,
    year: 2026,
    questionCount,
    latestSubmittedDate: "2026-02-20",
  };
}
