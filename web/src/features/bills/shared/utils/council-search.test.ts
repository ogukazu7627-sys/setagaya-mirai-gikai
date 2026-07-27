import { describe, expect, it } from "vitest";
import {
  createCouncilSearchFilters,
  hasActiveCouncilSearch,
} from "./council-search";

describe("createCouncilSearchFilters", () => {
  it("有効なURL条件だけを引き継ぐ", () => {
    expect(
      createCouncilSearchFilters(
        {
          type: "bill",
          theme: "education",
          committee: "文教常任委員会",
        },
        ["文教常任委員会", "福祉保健常任委員会"],
        ["education", "welfare"]
      )
    ).toEqual({
      contentType: "bill",
      themeId: "education",
      committeeName: "文教常任委員会",
    });
  });

  it("未知の条件を既定値へ戻す", () => {
    expect(
      createCouncilSearchFilters(
        {
          type: "committee",
          theme: "unknown",
          committee: "存在しない委員会",
        },
        ["文教常任委員会"],
        ["education", "welfare"]
      )
    ).toEqual({
      contentType: "all",
      themeId: "",
      committeeName: "",
    });
  });
});

describe("hasActiveCouncilSearch", () => {
  it("いずれかのフィルターが指定された場合だけtrueを返す", () => {
    expect(
      hasActiveCouncilSearch({
        contentType: "all",
        themeId: "",
        committeeName: "",
      })
    ).toBe(false);
    expect(
      hasActiveCouncilSearch({
        contentType: "report",
        themeId: "",
        committeeName: "",
      })
    ).toBe(true);
  });
});
