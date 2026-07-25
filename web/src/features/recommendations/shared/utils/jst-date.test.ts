import { describe, expect, it } from "vitest";
import { getJstDateKey, isJstDateKey } from "./jst-date";

describe("getJstDateKey", () => {
  it("uses the Asia/Tokyo date before and after the UTC boundary", () => {
    expect(getJstDateKey(new Date("2026-07-24T14:59:59.000Z"))).toBe(
      "2026-07-24"
    );
    expect(getJstDateKey(new Date("2026-07-24T15:00:00.000Z"))).toBe(
      "2026-07-25"
    );
  });
});

describe("isJstDateKey", () => {
  it("accepts calendar dates and rejects impossible values", () => {
    expect(isJstDateKey("2026-07-25")).toBe(true);
    expect(isJstDateKey("2026-02-30")).toBe(false);
    expect(isJstDateKey("2026-7-25")).toBe(false);
  });
});
