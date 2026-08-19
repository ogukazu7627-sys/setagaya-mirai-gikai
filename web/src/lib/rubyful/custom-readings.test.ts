import { describe, expect, it } from "vitest";
import {
  buildMonthCustomReadings,
  RUBYFUL_CUSTOM_READINGS,
} from "./custom-readings";

describe("buildMonthCustomReadings", () => {
  it("reads dates as がつ instead of つき", () => {
    const readings = buildMonthCustomReadings();
    expect(readings["3月"]).toBe("さんがつ");
    expect(readings["９月"]).toBe("くがつ");
    expect(readings.十二月).toBe("じゅうにがつ");
  });

  it("covers all twelve months in half-width, full-width and kanji forms", () => {
    const readings = buildMonthCustomReadings();
    expect(Object.keys(readings)).toHaveLength(36);
    for (let month = 1; month <= 12; month += 1) {
      expect(readings[`${month}月`]).toMatch(/がつ$/);
    }
  });
});

describe("RUBYFUL_CUSTOM_READINGS", () => {
  it("includes the month overrides", () => {
    expect(RUBYFUL_CUSTOM_READINGS["4月"]).toBe("しがつ");
  });

  it("fills in readings that the generator leaves blank", () => {
    expect(RUBYFUL_CUSTOM_READINGS.協力).toBe("きょうりょく");
  });

  it("reads budget classification terms the way the budget pages use them", () => {
    expect(RUBYFUL_CUSTOM_READINGS.歳出).toBe("さいしゅつ");
    expect(RUBYFUL_CUSTOM_READINGS.款).toBe("かん");
  });

  it("never maps a term to an empty reading", () => {
    for (const [term, reading] of Object.entries(RUBYFUL_CUSTOM_READINGS)) {
      expect(reading, `${term} has an empty reading`).not.toBe("");
    }
  });
});
