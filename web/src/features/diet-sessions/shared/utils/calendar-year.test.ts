import { describe, expect, it } from "vitest";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
  parseCalendarYear,
} from "./calendar-year";

describe("calendar-year", () => {
  describe("getCalendarYearFromDate", () => {
    it("1月1日はその年として扱う", () => {
      expect(getCalendarYearFromDate("2026-01-01")).toBe(2026);
    });

    it("12月31日はその年として扱う", () => {
      expect(getCalendarYearFromDate("2026-12-31")).toBe(2026);
    });

    it("翌年1月1日は新しい年として扱う", () => {
      expect(getCalendarYearFromDate("2027-01-01")).toBe(2027);
    });
  });

  describe("getCalendarYearRange", () => {
    it("年の開始日と終了日を返す", () => {
      expect(getCalendarYearRange(2026)).toEqual({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });
    });
  });

  describe("parseCalendarYear", () => {
    it("有効な年文字列を数値にする", () => {
      expect(parseCalendarYear("2025")).toBe(2025);
    });

    it("不正な値はnullを返す", () => {
      expect(parseCalendarYear("abc")).toBeNull();
    });
  });
});
