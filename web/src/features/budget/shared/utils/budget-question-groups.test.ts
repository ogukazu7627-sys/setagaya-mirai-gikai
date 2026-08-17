import { describe, expect, it } from "vitest";
import type { PublishedBudgetQuestion } from "../types/budget-question";
import {
  groupBudgetQuestionsByCouncilor,
  prioritizeFocusedBudgetQuestion,
} from "./budget-question-groups";

function createQuestion(
  id: string,
  councilorId: string
): PublishedBudgetQuestion {
  return {
    id,
    name: `質問 ${id}`,
    categorySlug: "education",
    majorCategory: "教育🏫",
    submittedDate: "2026-08-01",
    publishedAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    dietSession: null,
    partyOrGroup: "会派",
    councilor: {
      id: councilorId,
      displayName: `議員 ${councilorId}`,
      iconUrl: "/icons/councilor-default.svg",
    },
    contents: {},
  };
}

describe("groupBudgetQuestionsByCouncilor", () => {
  it("同じ議員の質問を1グループにまとめる", () => {
    const questions = [
      createQuestion("first-a", "a"),
      createQuestion("first-b", "b"),
      createQuestion("second-a", "a"),
    ];

    const groups = groupBudgetQuestionsByCouncilor(questions);

    expect(groups.map((group) => group.councilor.id)).toEqual(["a", "b"]);
    expect(groups[0]?.questions.map((question) => question.id)).toEqual([
      "first-a",
      "second-a",
    ]);
    expect(groups[1]?.questions.map((question) => question.id)).toEqual([
      "first-b",
    ]);
  });
});

describe("prioritizeFocusedBudgetQuestion", () => {
  it("マップから選んだ質問を同じ議員の一覧の先頭にする", () => {
    const questions = [
      createQuestion("first", "a"),
      createQuestion("focused", "a"),
      createQuestion("third", "a"),
    ];

    expect(
      prioritizeFocusedBudgetQuestion(questions, "focused").map(
        (question) => question.id
      )
    ).toEqual(["focused", "first", "third"]);
  });

  it("選択がない場合は元の並びを保つ", () => {
    const questions = [
      createQuestion("first", "a"),
      createQuestion("second", "a"),
    ];

    expect(
      prioritizeFocusedBudgetQuestion(questions).map((question) => question.id)
    ).toEqual(["first", "second"]);
  });
});
