import { describe, expect, it } from "vitest";
import type { BillsByMajorCategory, BillWithContent } from "../types";
import { MAJOR_CATEGORY_OPTIONS } from "../types";
import {
  paginateThemeBills,
  resolveInitialThemeCategoryId,
  THEME_BILLS_PAGE_SIZE,
} from "./theme-bills";

function createBill(id: string): BillWithContent {
  return { id, name: id } as BillWithContent;
}

function createGroup(
  categoryId: (typeof MAJOR_CATEGORY_OPTIONS)[number]["id"],
  billCount = 1
): BillsByMajorCategory {
  const category = MAJOR_CATEGORY_OPTIONS.find(
    (option) => option.id === categoryId
  );
  if (!category) {
    throw new Error(`Unknown category: ${categoryId}`);
  }

  return {
    category,
    bills: Array.from({ length: billCount }, (_, index) =>
      createBill(`${categoryId}-${index + 1}`)
    ),
  };
}

describe("resolveInitialThemeCategoryId", () => {
  it("uses the first preferred category that has bills", () => {
    const groups = [
      createGroup("education"),
      createGroup("disaster-prevention"),
    ];

    expect(
      resolveInitialThemeCategoryId(groups, [
        "child-rearing",
        "disaster-prevention",
        "education",
      ])
    ).toBe("disaster-prevention");
  });

  it("falls back to the first available category", () => {
    const groups = [
      createGroup("education"),
      createGroup("disaster-prevention"),
    ];

    expect(resolveInitialThemeCategoryId(groups, ["industry"])).toBe(
      "education"
    );
    expect(resolveInitialThemeCategoryId([], ["education"])).toBeNull();
  });
});

describe("paginateThemeBills", () => {
  const bills = Array.from({ length: 25 }, (_, index) =>
    createBill(`bill-${index + 1}`)
  );

  it("returns ten bills at a time", () => {
    const firstPage = paginateThemeBills(bills, 1);
    const secondPage = paginateThemeBills(bills, 2);
    const thirdPage = paginateThemeBills(bills, 3);

    expect(THEME_BILLS_PAGE_SIZE).toBe(10);
    expect(firstPage.bills.map(({ id }) => id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `bill-${index + 1}`)
    );
    expect(secondPage.bills.map(({ id }) => id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `bill-${index + 11}`)
    );
    expect(thirdPage.bills.map(({ id }) => id)).toEqual([
      "bill-21",
      "bill-22",
      "bill-23",
      "bill-24",
      "bill-25",
    ]);
    expect(thirdPage.totalPages).toBe(3);
  });

  it("clamps out-of-range pages without failing", () => {
    expect(paginateThemeBills(bills, 0).currentPage).toBe(1);
    expect(paginateThemeBills(bills, 99).currentPage).toBe(3);
    expect(paginateThemeBills([], 1)).toEqual({
      bills: [],
      currentPage: 1,
      totalPages: 1,
    });
  });
});
