import { describe, expect, it } from "vitest";
import {
  buildCouncilorQuestionCounts,
  createEmptyCouncilorQuestionCounts,
  getCouncilorQuestionVenue,
  mergeCouncilorQuestionCounts,
} from "./councilor-question-counts";

describe("councilor question counts", () => {
  it("starts from zero for every question venue", () => {
    expect(createEmptyCouncilorQuestionCounts()).toEqual({
      total: 0,
      general: 0,
      budget: 0,
      committee: 0,
    });
  });

  it("maps publication categories to user-facing question venues", () => {
    expect(getCouncilorQuestionVenue("general_question")).toBe("general");
    expect(getCouncilorQuestionVenue("budget")).toBe("budget");
    expect(getCouncilorQuestionVenue("report")).toBe("committee");
  });

  it("counts all published question venues into one breakdown", () => {
    expect(
      buildCouncilorQuestionCounts([
        "report",
        "general_question",
        "budget",
        "report",
      ])
    ).toEqual({
      total: 4,
      general: 1,
      budget: 1,
      committee: 2,
    });
  });

  it("merges multiple councilor count objects", () => {
    expect(
      mergeCouncilorQuestionCounts([
        { total: 2, general: 1, budget: 0, committee: 1 },
        { total: 3, general: 0, budget: 2, committee: 1 },
      ])
    ).toEqual({
      total: 5,
      general: 1,
      budget: 2,
      committee: 2,
    });
  });
});
