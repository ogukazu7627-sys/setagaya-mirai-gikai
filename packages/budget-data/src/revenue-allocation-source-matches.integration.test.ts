import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type RawPdfRevenueAllocation,
  type RevenueAllocationSourceMatchBuildResult,
  type RevenueAllocationSourceMatchValidation,
  type RevenueDetailMatchSource,
  parseRawPdfRevenueAllocations,
  parseRevenueDetailsForAllocationMatching,
  serializeRevenueAllocationSourceOverrides,
  transformRevenueAllocationSourceMatches,
  validateRevenueAllocationSourceMatches,
  validateSerializedRevenueAllocationSourceOverrides,
} from "./revenue-allocation-source-matches";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

describe("Phase 28 実データ回帰", () => {
  let rawRows: RawPdfRevenueAllocation[];
  let details: RevenueDetailMatchSource[];
  let result: RevenueAllocationSourceMatchBuildResult;
  let validation: RevenueAllocationSourceMatchValidation;

  beforeAll(async () => {
    const [rawCsv, detailsCsv] = await Promise.all([
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "raw_pdf_revenue_allocations.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_revenue_details.csv",
        ),
        "utf8",
      ),
    ]);
    rawRows = parseRawPdfRevenueAllocations(rawCsv);
    details =
      parseRevenueDetailsForAllocationMatching(detailsCsv);
    result = transformRevenueAllocationSourceMatches(
      rawRows,
      details,
    );
    validation = validateRevenueAllocationSourceMatches(
      rawRows,
      details,
      result,
    );
  });

  it("raw 1,948行を欠落・重複なく保持する", () => {
    expect(validation.rawRowCount).toBe(1_948);
    expect(validation.outputRowCount).toBe(1_948);
    expect(validation.uniqueRawAllocationIdCount).toBe(1_948);
    expect(validation.rawValueDifferenceCount).toBe(0);
  });

  it("1,915細節をすべて厳密な階層コードと金額で接続する", () => {
    expect(validation.pdfRevenueDetailGroupCount).toBe(1_915);
    expect(validation.statusGroupCounts).toMatchObject({
      matched: 1_915,
      ambiguous: 0,
      unmatched: 0,
      manually_confirmed: 0,
    });
    expect(validation.methodGroupCounts).toMatchObject({
      hierarchy_code_amount: 1_915,
      hierarchy_code_amount_department: 0,
      hierarchy_code_name_amount: 0,
      manual_override: 0,
    });
    expect(validation.uniqueMatchedRevenueDetailIdCount).toBe(1_915);
    expect(validation.matchedRevenueDetailIdMissingCount).toBe(0);
    expect(validation.isPass).toBe(true);
  });

  it("複数充当先の後続行も同じrevenue_detail_idを持つ", () => {
    const groupsWithMultipleAllocations = result.decisions.filter(
      (decision) => decision.relatedRawAllocationIds.length > 1,
    );
    expect(groupsWithMultipleAllocations).toHaveLength(27);
    for (const decision of groupsWithMultipleAllocations) {
      const matches = result.matches.filter((match) =>
        decision.relatedRawAllocationIds.includes(
          match.raw_allocation_id,
        ),
      );
      expect(
        new Set(matches.map((match) => match.revenue_detail_id)).size,
      ).toBe(1);
    }
  });

  it("未解決候補がなく手動補正CSVはヘッダーのみになる", () => {
    expect(result.overrideRows).toHaveLength(0);
    const csv = serializeRevenueAllocationSourceOverrides(
      result.overrideRows,
    );
    expect(csv.trim().split("\n")).toHaveLength(1);
    expect(() =>
      validateSerializedRevenueAllocationSourceOverrides(
        csv,
        result.overrideRows,
      ),
    ).not.toThrow();
  });
});
