import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("accepts UUID values", () => {
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
  });

  it.each([
    "",
    "not-a-uuid",
    "123e4567-e89b-02d3-a456-426614174000",
    "123e4567-e89b-42d3-c456-426614174000",
  ])("rejects %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });
});
