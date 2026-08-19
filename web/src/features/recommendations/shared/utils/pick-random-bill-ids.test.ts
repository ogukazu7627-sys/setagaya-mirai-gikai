import { describe, expect, it } from "vitest";
import { pickRandomBillIds } from "./pick-random-bill-ids";

describe("pickRandomBillIds", () => {
  it("returns the requested number of unique ids", () => {
    const picked = pickRandomBillIds(["a", "b", "c", "d", "e", "f"], 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    for (const id of picked) {
      expect(["a", "b", "c", "d", "e", "f"]).toContain(id);
    }
  });

  it("never returns more ids than are available", () => {
    expect(pickRandomBillIds(["a", "b"], 5)).toHaveLength(2);
    expect(pickRandomBillIds([], 5)).toEqual([]);
  });

  it("drops duplicated ids before picking", () => {
    expect(pickRandomBillIds(["a", "a", "a"], 3)).toEqual(["a"]);
  });

  it("returns nothing when a non-positive count is requested", () => {
    expect(pickRandomBillIds(["a", "b"], 0)).toEqual([]);
    expect(pickRandomBillIds(["a", "b"], -1)).toEqual([]);
  });

  it("stays in range for the extreme values a random source can return", () => {
    const ids = ["a", "b", "c", "d"];
    expect(pickRandomBillIds(ids, 4, () => 0).sort()).toEqual(ids);
    // Math.random() は 1 を返さないが、境界でも範囲外を選ばないことを固定する。
    expect(pickRandomBillIds(ids, 4, () => 0.999999).sort()).toEqual(ids);
    expect(pickRandomBillIds(ids, 4, () => 1).sort()).toEqual(ids);
  });

  it("varies the order across calls with different random sources", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const first = pickRandomBillIds(ids, 3, () => 0);
    const second = pickRandomBillIds(ids, 3, () => 0.9);
    expect(first).not.toEqual(second);
  });
});
