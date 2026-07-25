import { describe, expect, it } from "vitest";
import { orderDeterministically } from "./deterministic-order";

describe("orderDeterministically", () => {
  const values = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("returns the same order for the same seed", () => {
    expect(orderDeterministically(values, "same", (item) => item.id)).toEqual(
      orderDeterministically(values, "same", (item) => item.id)
    );
  });

  it("does not mutate the input", () => {
    const original = [...values];
    orderDeterministically(values, "seed", (item) => item.id);
    expect(values).toEqual(original);
  });
});
