import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_DEFAULT_VARIANT,
  parseBudgetMapVariant,
} from "./budget-map-variant";

describe("parseBudgetMapVariant", () => {
  it("既定は v2", () => {
    expect(BUDGET_MAP_DEFAULT_VARIANT).toBe("v2");
    expect(parseBudgetMapVariant(undefined)).toBe("v2");
    expect(parseBudgetMapVariant(null)).toBe("v2");
    expect(parseBudgetMapVariant("")).toBe("v2");
  });

  it("比較用に v1 を指定できる", () => {
    expect(parseBudgetMapVariant("v1")).toBe("v1");
  });

  it("配列で渡された場合は先頭を使う", () => {
    expect(parseBudgetMapVariant(["v1", "v2"])).toBe("v1");
    expect(parseBudgetMapVariant([])).toBe("v2");
  });

  it("未知の値は既定へ倒す", () => {
    expect(parseBudgetMapVariant("v3")).toBe("v2");
    expect(parseBudgetMapVariant("../../etc/passwd")).toBe("v2");
  });
});
