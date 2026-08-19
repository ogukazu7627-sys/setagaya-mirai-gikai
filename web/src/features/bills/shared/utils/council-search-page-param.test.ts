import { describe, expect, it } from "vitest";
import {
  applyCouncilSearchPageParam,
  parseCouncilSearchPage,
} from "./council-search-page-param";

describe("parseCouncilSearchPage", () => {
  it("reads a valid page number", () => {
    expect(parseCouncilSearchPage("3")).toBe(3);
  });

  it("falls back to the first page for missing or invalid values", () => {
    expect(parseCouncilSearchPage(undefined)).toBe(1);
    expect(parseCouncilSearchPage("")).toBe(1);
    expect(parseCouncilSearchPage("abc")).toBe(1);
    expect(parseCouncilSearchPage("0")).toBe(1);
    expect(parseCouncilSearchPage("-2")).toBe(1);
  });

  it("ignores trailing characters the same way parseInt does", () => {
    expect(parseCouncilSearchPage("4abc")).toBe(4);
  });
});

describe("applyCouncilSearchPageParam", () => {
  it("omits the parameter on the first page", () => {
    const params = new URLSearchParams("type=report&page=5");
    applyCouncilSearchPageParam(params, 1);
    expect(params.toString()).toBe("type=report");
  });

  it("writes the page number from the second page on", () => {
    const params = new URLSearchParams("type=report");
    applyCouncilSearchPageParam(params, 3);
    expect(params.get("page")).toBe("3");
  });

  it("replaces an existing page number", () => {
    const params = new URLSearchParams("page=2");
    applyCouncilSearchPageParam(params, 7);
    expect(params.getAll("page")).toEqual(["7"]);
  });
});
