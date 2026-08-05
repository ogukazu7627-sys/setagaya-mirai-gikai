import { describe, expect, it } from "vitest";
import {
  getCouncilorStatementAnchorId,
  getCouncilorStatementIndexFromHash,
} from "./councilor-statement-anchor";

describe("councilor statement anchors", () => {
  it("uses the statement index as a stable fragment id", () => {
    expect(getCouncilorStatementAnchorId(0)).toBe("councilor-opinion-0");
    expect(getCouncilorStatementAnchorId(2)).toBe("councilor-opinion-2");
  });

  it("normalizes unsafe statement indexes", () => {
    expect(getCouncilorStatementAnchorId(1.8)).toBe("councilor-opinion-1");
    expect(getCouncilorStatementAnchorId(-1)).toBe("councilor-opinion-0");
    expect(getCouncilorStatementAnchorId(Number.NaN)).toBe(
      "councilor-opinion-0"
    );
  });

  it("extracts a statement index only from councilor opinion hashes", () => {
    expect(getCouncilorStatementIndexFromHash("#councilor-opinion-3")).toBe(3);
    expect(getCouncilorStatementIndexFromHash("councilor-opinion-12")).toBe(12);
    expect(
      getCouncilorStatementIndexFromHash("#councilor-opinion-2-extra")
    ).toBeNull();
    expect(getCouncilorStatementIndexFromHash("#other-section")).toBeNull();
  });
});
