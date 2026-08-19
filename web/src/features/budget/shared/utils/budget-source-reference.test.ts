import { describe, expect, it } from "vitest";
import {
  describeBudgetSourceReference,
  listBudgetSourceReferenceLabels,
} from "./budget-source-reference";

describe("describeBudgetSourceReference", () => {
  it("formats a CSV row reference", () => {
    expect(
      describeBudgetSourceReference({
        source_type: "official_csv",
        source_file: "ippansaisyutu.csv",
        source_row_number: 10232,
      })
    ).toBe("公式CSV / ippansaisyutu.csv / 元CSV 10232行");
  });

  it("formats a PDF page reference", () => {
    expect(
      describeBudgetSourceReference({
        sourceType: "official_pdf",
        sourceFile: "r8tousyoyosanallpage.pdf",
        pdfPage: 109,
        budgetBookPage: 211,
      })
    ).toBe(
      "公式PDF / r8tousyoyosanallpage.pdf / PDF 109ページ / 冊子 211ページ"
    );
  });

  it("falls back when the payload is not an object", () => {
    expect(describeBudgetSourceReference(null)).toBe("出典情報あり");
    expect(describeBudgetSourceReference("csv")).toBe("出典情報あり");
  });
});

describe("listBudgetSourceReferenceLabels", () => {
  it("drops duplicates while keeping the original order", () => {
    const csvRow = (row: number) => ({
      source_type: "official_csv",
      source_file: "ippansaisyutu.csv",
      source_row_number: row,
    });

    expect(
      listBudgetSourceReferenceLabels([
        csvRow(10232),
        csvRow(10085),
        csvRow(10232),
      ])
    ).toEqual([
      "公式CSV / ippansaisyutu.csv / 元CSV 10232行",
      "公式CSV / ippansaisyutu.csv / 元CSV 10085行",
    ]);
  });

  it("returns an empty list for no sources", () => {
    expect(listBudgetSourceReferenceLabels([])).toEqual([]);
  });
});
