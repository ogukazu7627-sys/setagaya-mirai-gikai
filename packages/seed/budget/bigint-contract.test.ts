import { describe, expect, it } from "vitest";
import { budgetSafeIntegerSchema } from "./public-budget-dataset-schemas";

describe("budget bigint contract", () => {
  it("JSONで扱う金額はJavaScriptの安全整数範囲に限定する", () => {
    expect(
      budgetSafeIntegerSchema.safeParse(Number.MAX_SAFE_INTEGER).success
    ).toBe(true);
    expect(
      budgetSafeIntegerSchema.safeParse(Number.MIN_SAFE_INTEGER).success
    ).toBe(true);
    expect(
      budgetSafeIntegerSchema.safeParse(Number.MAX_SAFE_INTEGER + 1).success
    ).toBe(false);
    expect(
      budgetSafeIntegerSchema.safeParse(Number.MIN_SAFE_INTEGER - 1).success
    ).toBe(false);
  });

  it("JavaScript BigIntをJSONへ直接シリアライズしない", () => {
    expect(() => JSON.stringify({ amount: 1n })).toThrow(TypeError);
  });
});
