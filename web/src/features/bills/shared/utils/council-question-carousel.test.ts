import { describe, expect, it } from "vitest";
import { getCouncilQuestionCarouselWindow } from "./council-question-carousel";

const groups = ["a", "b", "c", "d", "e"].map((id) => ({
  councilor: { id },
}));

describe("getCouncilQuestionCarouselWindow", () => {
  it("現在の議員と前後を含む最大3人だけを返す", () => {
    expect(
      getCouncilQuestionCarouselWindow(groups, "c").map(
        (group) => group.councilor.id
      )
    ).toEqual(["b", "c", "d"]);
  });

  it("先頭と末尾でも3人の範囲を維持する", () => {
    expect(
      getCouncilQuestionCarouselWindow(groups, "a").map(
        (group) => group.councilor.id
      )
    ).toEqual(["a", "b", "c"]);
    expect(
      getCouncilQuestionCarouselWindow(groups, "e").map(
        (group) => group.councilor.id
      )
    ).toEqual(["c", "d", "e"]);
  });

  it("3人以下なら全員を返す", () => {
    expect(
      getCouncilQuestionCarouselWindow(groups.slice(0, 2), "a").map(
        (group) => group.councilor.id
      )
    ).toEqual(["a", "b"]);
  });
});
