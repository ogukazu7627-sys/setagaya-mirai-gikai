import { describe, expect, it } from "vitest";
import type { BillWithContent } from "../types";
import { groupBillsByMajorCategory } from "./group-bills-by-major-category";

function bill(
  id: string,
  majorCategory: string,
  itemType: BillWithContent["item_type"] = "bill",
  submittedDate = "2026-01-01"
): BillWithContent {
  return {
    id,
    major_category: majorCategory,
    item_type: itemType,
    submitted_date: submittedDate,
    tags: [],
  } as unknown as BillWithContent;
}

describe("groupBillsByMajorCategory", () => {
  it("deduplicates bills and keeps the shared category and item ordering", () => {
    const question = bill("question", "教育🏫", "question", "2026-01-01");
    const result = groupBillsByMajorCategory([
      bill("report", "教育🏫", "report", "2026-02-01"),
      question,
      question,
      bill("daily-life", "暮らし🙋", "bill", "2026-03-01"),
    ]);

    expect(result.map(({ category }) => category.label)).toEqual([
      "教育🏫",
      "暮らし🙋",
    ]);
    expect(result[0]?.bills.map(({ id }) => id)).toEqual([
      "question",
      "report",
    ]);
  });

  it("omits empty categories", () => {
    const result = groupBillsByMajorCategory([bill("education", "教育🏫")]);

    expect(result).toHaveLength(1);
    expect(result[0]?.category.label).toBe("教育🏫");
  });
});
