import { describe, expect, it } from "vitest";
import { buildDailyPushPayload } from "./push-notification";

describe("buildDailyPushPayload", () => {
  it("uses only the first title and summarizes the remaining count", () => {
    expect(buildDailyPushPayload("学校の暑さ対策", 5, "2026-07-25")).toEqual({
      title: "今日のあなたへのおすすめ",
      body: "「学校の暑さ対策」ほか4件",
      date: "2026-07-25",
    });
  });

  it("uses the title alone for one recommendation", () => {
    expect(buildDailyPushPayload("学校の暑さ対策", 1, "2026-07-25").body).toBe(
      "学校の暑さ対策"
    );
  });
});
