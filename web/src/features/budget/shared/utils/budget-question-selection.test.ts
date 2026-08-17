import { describe, expect, it } from "vitest";
import { BUDGET_OVERALL_MAJOR_CATEGORY } from "../constants/budget-major-category";
import type { BudgetQuestionCategorySlug } from "../constants/budget-question-categories";
import type { PublishedBudgetQuestion } from "../types/budget-question";
import {
  buildDailyBudgetQuestionGroups,
  getJapanDateKey,
  selectDailyBudgetQuestions,
} from "./budget-question-selection";

function createQuestion(
  index: number,
  options: {
    categorySlug?: BudgetQuestionCategorySlug;
    councilorId?: string;
  } = {}
): PublishedBudgetQuestion {
  const categorySlug = options.categorySlug ?? "education";
  const councilorId = options.councilorId ?? `councilor-${index}`;
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    name: `予算質問${index}`,
    categorySlug,
    majorCategory:
      categorySlug === "all" ? BUDGET_OVERALL_MAJOR_CATEGORY : "教育🏫",
    submittedDate: "2026-08-01",
    publishedAt: "2026-08-02T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
    dietSession: null,
    councilor: {
      id: councilorId,
      displayName: `議員${councilorId}`,
      iconUrl: `/icons/councilors/${councilorId}.jpg`,
    },
    contents: {
      normal: {
        difficultyLevel: "normal",
        title: `質問${index}`,
        summary: `概要${index}`,
        content: `本文${index}`,
      },
    },
  };
}

describe("getJapanDateKey", () => {
  it("日本時間の0時で日付を切り替える", () => {
    expect(getJapanDateKey(new Date("2026-08-16T14:59:59Z"))).toBe(
      "2026-08-16"
    );
    expect(getJapanDateKey(new Date("2026-08-16T15:00:00Z"))).toBe(
      "2026-08-17"
    );
  });
});

describe("selectDailyBudgetQuestions", () => {
  const questions = [1, 2, 3, 4].map((index) => createQuestion(index));

  it("同じ日と大分類では同じ最大3件を返す", () => {
    const first = selectDailyBudgetQuestions(
      questions,
      "education",
      "2026-08-17"
    );
    const second = selectDailyBudgetQuestions(
      [...questions].reverse(),
      "education",
      "2026-08-17"
    );

    expect(first).toHaveLength(3);
    expect(second).toEqual(first);
  });

  it("翌日は組み合わせをローテーションする", () => {
    expect(
      selectDailyBudgetQuestions(questions, "education", "2026-08-17")
    ).not.toEqual(
      selectDailyBudgetQuestions(questions, "education", "2026-08-18")
    );
  });

  it("異なる議員を優先し、足りない場合だけ同じ議員で補う", () => {
    const candidates = [
      createQuestion(1, { councilorId: "a" }),
      createQuestion(2, { councilorId: "a" }),
      createQuestion(3, { councilorId: "b" }),
      createQuestion(4, { councilorId: "c" }),
    ];
    const selected = selectDailyBudgetQuestions(
      candidates,
      "education",
      "2026-08-17"
    );
    expect(new Set(selected.map((question) => question.member)).size).toBe(3);

    const twoCouncilors = selectDailyBudgetQuestions(
      candidates.slice(0, 3),
      "education",
      "2026-08-17"
    );
    expect(twoCouncilors).toHaveLength(3);
    expect(new Set(twoCouncilors.map((question) => question.member)).size).toBe(
      2
    );
  });

  it("指定大分類以外の質問を混ぜない", () => {
    const selected = selectDailyBudgetQuestions(
      [createQuestion(1), createQuestion(2, { categorySlug: "all" })],
      "all",
      "2026-08-17"
    );
    expect(selected.map((question) => question.text)).toEqual(["予算質問2"]);
  });
});

describe("buildDailyBudgetQuestionGroups", () => {
  it("全体画面には全体案件だけを割り当てる", () => {
    const groups = buildDailyBudgetQuestionGroups(
      [createQuestion(1), createQuestion(2, { categorySlug: "all" })],
      new Date("2026-08-17T03:00:00Z")
    );
    expect(groups.all.map((question) => question.text)).toEqual(["予算質問2"]);
    expect(groups.education.map((question) => question.text)).toEqual([
      "予算質問1",
    ]);
  });
});
