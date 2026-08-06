import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_SAMPLE_QUESTION_ID,
  getBudgetMapSampleQuestions,
  isBudgetMapSampleQuestionId,
  shouldShowBudgetMapSampleQuestions,
} from "./budget-map-sample-questions";

describe("shouldShowBudgetMapSampleQuestions", () => {
  it("未指定なら表示する", () => {
    expect(shouldShowBudgetMapSampleQuestions(undefined)).toBe(true);
    expect(shouldShowBudgetMapSampleQuestions(null)).toBe(true);
    expect(shouldShowBudgetMapSampleQuestions("")).toBe(true);
  });

  it("0 を指定したときだけ止める", () => {
    expect(shouldShowBudgetMapSampleQuestions("0")).toBe(false);
  });

  it("0 以外の値では止めない", () => {
    expect(shouldShowBudgetMapSampleQuestions("1")).toBe(true);
    expect(shouldShowBudgetMapSampleQuestions("false")).toBe(true);
    expect(shouldShowBudgetMapSampleQuestions("yes")).toBe(true);
  });

  it("配列で渡された場合は先頭を使う", () => {
    expect(shouldShowBudgetMapSampleQuestions(["0"])).toBe(false);
    expect(shouldShowBudgetMapSampleQuestions(["1"])).toBe(true);
    expect(shouldShowBudgetMapSampleQuestions([])).toBe(true);
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

  it("止めているときは空にする", () => {
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
