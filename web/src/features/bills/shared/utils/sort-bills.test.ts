import { describe, expect, it } from "vitest";
import { sortBillsForHomeList } from "./sort-bills";

describe("sortBillsForHomeList", () => {
  it("質問、議案、請願・陳情、報告事項の順に並べる", () => {
    const result = sortBillsForHomeList([
      { id: "report", item_type: "report", submitted_date: "2026-05-01" },
      { id: "petition", item_type: "petition", submitted_date: "2026-05-01" },
      { id: "bill", item_type: "bill", submitted_date: "2026-05-01" },
      { id: "question", item_type: "question", submitted_date: "2026-05-01" },
    ]);

    expect(result.map((bill) => bill.id)).toEqual([
      "question",
      "bill",
      "petition",
      "report",
    ]);
  });

  it("同じ種別では提出日が新しい順に並べる", () => {
    const result = sortBillsForHomeList([
      { id: "old", item_type: "bill", submitted_date: "2026-05-01" },
      { id: "new", item_type: "bill", submitted_date: "2026-06-01" },
    ]);

    expect(result.map((bill) => bill.id)).toEqual(["new", "old"]);
  });

  it("提出日がない案件は同じ種別の末尾に並べる", () => {
    const result = sortBillsForHomeList([
      { id: "missing", item_type: "question", submitted_date: null },
      { id: "dated", item_type: "question", submitted_date: "2026-05-01" },
    ]);

    expect(result.map((bill) => bill.id)).toEqual(["dated", "missing"]);
  });
});
