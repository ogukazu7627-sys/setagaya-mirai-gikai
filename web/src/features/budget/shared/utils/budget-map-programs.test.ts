import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_DESKTOP_PROGRAM_PAGE_SIZE,
  BUDGET_MAP_MOBILE_PROGRAM_PAGE_SIZE,
  getBudgetMapAmountTier,
  getBudgetMapProgramPage,
  getBudgetMapProgramPageSize,
} from "./budget-map-programs";

describe("budget map programs", () => {
  it("初期ページを最大10件に制限し、残りを次ページへ送る", () => {
    const programs = Array.from({ length: 13 }, (_, index) => index + 1);
    const firstPage = getBudgetMapProgramPage(programs, 0);
    const secondPage = getBudgetMapProgramPage(programs, 1);

    expect(BUDGET_MAP_DESKTOP_PROGRAM_PAGE_SIZE).toBe(10);
    expect(firstPage).toMatchObject({
      items: programs.slice(0, 10),
      pageIndex: 0,
      pageCount: 2,
      startNumber: 1,
      endNumber: 10,
      totalCount: 13,
    });
    expect(secondPage).toMatchObject({
      items: programs.slice(10),
      pageIndex: 1,
      pageCount: 2,
      startNumber: 11,
      endNumber: 13,
      totalCount: 13,
    });
  });

  it("mobileは1ページを6件に抑える", () => {
    const programs = Array.from({ length: 13 }, (_, index) => index + 1);
    const firstPage = getBudgetMapProgramPage(
      programs,
      0,
      BUDGET_MAP_MOBILE_PROGRAM_PAGE_SIZE
    );

    expect(getBudgetMapProgramPageSize("desktop")).toBe(10);
    expect(getBudgetMapProgramPageSize("mobile")).toBe(6);
    expect(firstPage).toMatchObject({
      items: programs.slice(0, 6),
      pageCount: 3,
      startNumber: 1,
      endNumber: 6,
    });
  });

  it("範囲外のページ番号を安全なページへ補正する", () => {
    expect(getBudgetMapProgramPage([1, 2], -10).pageIndex).toBe(0);
    expect(getBudgetMapProgramPage([1, 2], 10).pageIndex).toBe(0);
    expect(getBudgetMapProgramPage([], 3)).toEqual({
      items: [],
      pageIndex: 0,
      pageCount: 1,
      startNumber: 0,
      endNumber: 0,
      totalCount: 0,
    });
  });

  it("同じ表示ページ内の金額を過剰に差別化せず3段階へ分ける", () => {
    const amounts = [0, 10, 20, 30, 40, 50];

    expect(getBudgetMapAmountTier(0, amounts)).toBe("low");
    expect(getBudgetMapAmountTier(30, amounts)).toBe("medium");
    expect(getBudgetMapAmountTier(50, amounts)).toBe("high");
    expect(getBudgetMapAmountTier(100, [100])).toBe("medium");
  });
});
