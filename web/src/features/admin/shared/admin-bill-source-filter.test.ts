import { describe, expect, it } from "vitest";
import {
  getAdminBillSourcePostgrestFilter,
  hasAdminBillSources,
  matchesAdminBillSourceFilter,
  normalizeAdminBillSourceFilter,
} from "./admin-bill-source-filter";

describe("admin bill source filter", () => {
  it("accepts only supported filter values", () => {
    expect(normalizeAdminBillSourceFilter("with")).toBe("with");
    expect(normalizeAdminBillSourceFilter("without")).toBe("without");
    expect(normalizeAdminBillSourceFilter("unknown")).toBe("");
    expect(normalizeAdminBillSourceFilter(undefined)).toBe("");
  });

  it("treats a non-empty source array as having official sources", () => {
    expect(
      hasAdminBillSources([
        {
          title: "世田谷区公式資料",
          url: "https://www.city.setagaya.lg.jp/",
        },
      ])
    ).toBe(true);
    expect(hasAdminBillSources([])).toBe(false);
    expect(hasAdminBillSources(null)).toBe(false);
  });

  it("matches bills by source presence", () => {
    const sources = [{ title: "公式資料" }];

    expect(matchesAdminBillSourceFilter(sources, "")).toBe(true);
    expect(matchesAdminBillSourceFilter(sources, "with")).toBe(true);
    expect(matchesAdminBillSourceFilter(sources, "without")).toBe(false);
    expect(matchesAdminBillSourceFilter([], "with")).toBe(false);
    expect(matchesAdminBillSourceFilter([], "without")).toBe(true);
  });

  it("uses an explicit JSON array for the PostgREST filter", () => {
    expect(getAdminBillSourcePostgrestFilter("with")).toEqual({
      operator: "neq",
      value: "[]",
    });
    expect(getAdminBillSourcePostgrestFilter("without")).toEqual({
      operator: "eq",
      value: "[]",
    });
    expect(getAdminBillSourcePostgrestFilter("")).toBeNull();
  });
});
