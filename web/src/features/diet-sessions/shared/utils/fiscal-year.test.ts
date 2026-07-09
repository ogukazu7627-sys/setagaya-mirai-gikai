import { describe, expect, it } from "vitest";
import {
  getFiscalYearFromDate,
  getFiscalYearRange,
  parseFiscalYear,
} from "./fiscal-year";

describe("fiscal-year", () => {
  describe("getFiscalYearFromDate", () => {
    it("4月1日はその年の年度として扱う", () => {
      expect(getFiscalYearFromDate("2026-04-01")).toBe(2026);
    });

    it("翌年3月31日は前年の年度として扱う", () => {
      expect(getFiscalYearFromDate("2027-03-31")).toBe(2026);
    });

    it("翌年4月1日は新しい年度として扱う", () => {
      expect(getFiscalYearFromDate("2027-04-01")).toBe(2027);
    });
  });

  describe("getFiscalYearRange", () => {
    it("年度の開始日と終了日を返す", () => {
      expect(getFiscalYearRange(2026)).toEqual({
        startDate: "2026-04-01",
        endDate: "2027-03-31",
      });
    });
  });

  describe("parseFiscalYear", () => {
    it("有効な年度文字列を数値にする", () => {
      expect(parseFiscalYear("2025")).toBe(2025);
    });

    it("不正な値はnullを返す", () => {
      expect(parseFiscalYear("abc")).toBeNull();
    });
  });
});
