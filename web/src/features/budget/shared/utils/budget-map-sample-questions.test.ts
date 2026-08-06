import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_SAMPLE_QUESTION_ID,
  getBudgetMapSampleQuestions,
  isBudgetMapSampleQuestionId,
  shouldShowBudgetMapSampleQuestions,
} from "./budget-map-sample-questions";

describe("shouldShowBudgetMapSampleQuestions", () => {
  it("明示的に指定したときだけ出す", () => {
    expect(shouldShowBudgetMapSampleQuestions("1")).toBe(true);
  });

  it("未指定なら出さない", () => {
    expect(shouldShowBudgetMapSampleQuestions(undefined)).toBe(false);
    expect(shouldShowBudgetMapSampleQuestions(null)).toBe(false);
    expect(shouldShowBudgetMapSampleQuestions("")).toBe(false);
  });

  it("未知の値では出さない", () => {
    expect(shouldShowBudgetMapSampleQuestions("true")).toBe(false);
    expect(shouldShowBudgetMapSampleQuestions("0")).toBe(false);
    expect(shouldShowBudgetMapSampleQuestions("yes")).toBe(false);
  });

  it("配列で渡された場合は先頭を使う", () => {
    expect(shouldShowBudgetMapSampleQuestions(["1"])).toBe(true);
    expect(shouldShowBudgetMapSampleQuestions([])).toBe(false);
  });
});

describe("getBudgetMapSampleQuestions", () => {
  it("有効なときだけ1件返す", () => {
    const questions = getBudgetMapSampleQuestions(true);

    expect(questions).toHaveLength(1);
    expect(questions[0]).toEqual({
      questionId: BUDGET_MAP_SAMPLE_QUESTION_ID,
      text: "将来の財政は大丈夫なのでしょうか",
      member: "くろだあいこ",
      photo: "/icons/councilors/kuroda-aiko.jpg",
    });
  });

  it("無効なら空にする。既定で本番へ出さないため", () => {
    expect(getBudgetMapSampleQuestions(false)).toEqual([]);
  });
});

describe("isBudgetMapSampleQuestionId", () => {
  it("動作確認用のIDを見分けられる", () => {
    expect(isBudgetMapSampleQuestionId(BUDGET_MAP_SAMPLE_QUESTION_ID)).toBe(
      true
    );
    expect(isBudgetMapSampleQuestionId("real-question-1")).toBe(false);
  });
});
