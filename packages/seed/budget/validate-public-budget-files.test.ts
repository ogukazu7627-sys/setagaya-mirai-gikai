import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  publicBudgetTestExpectations,
  writePublicBudgetTestFixture,
} from "./public-budget-test-fixture";
import { readPublicBudgetDataset } from "./read-public-budget-files";
import { validatePublicBudgetDataset } from "./validate-public-budget-files";

const temporaryDirectories: string[] = [];

function loadFixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "public-budget-validation-")
  );
  temporaryDirectories.push(directory);
  writePublicBudgetTestFixture(directory);
  return readPublicBudgetDataset({ inputDirectory: directory });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("validatePublicBudgetDataset", () => {
  it("正しいデータセットをPASSにする", () => {
    const result = validatePublicBudgetDataset(
      loadFixture(),
      publicBudgetTestExpectations
    );

    expect(result.status).toBe("PASS");
    expect(result.issues).toEqual([]);
    expect(result.summary?.totals).toEqual({
      programIdentityExpenditure: 100,
      programExpenditure: 100,
      budgetItemExpenditure: 100,
      revenueDetail: 100,
      revenueItem: 100,
    });
  });

  it("programから存在しないidentityへの参照を検出する", () => {
    const dataset = loadFixture();
    dataset.programs[0].budget_program_identity_id = "missing_identity";

    const result = validatePublicBudgetDataset(
      dataset,
      publicBudgetTestExpectations
    );

    expect(result.status).toBe("FAIL");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PROGRAM_IDENTITY_REFERENCE_MISSING",
        }),
      ])
    );
  });

  it("budget item内の存在しないprogram_idを検出する", () => {
    const dataset = loadFixture();
    dataset.budgetItems[0].programs[0].programId = "missing_program";

    const result = validatePublicBudgetDataset(
      dataset,
      publicBudgetTestExpectations
    );

    expect(result.status).toBe("FAIL");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BUDGET_ITEM_PROGRAM_REFERENCE_MISSING",
        }),
      ])
    );
  });

  it("allocationの参照欠落とresolution level矛盾を検出する", () => {
    const dataset = loadFixture();
    const allocation = dataset.revenueAllocations[0];
    allocation.revenueDetailId = "missing_revenue_detail";
    allocation.targetBudgetProgramIdentityId = "missing_identity";
    allocation.targetBudgetProgramGroupId = null;

    const result = validatePublicBudgetDataset(
      dataset,
      publicBudgetTestExpectations
    );

    expect(result.status).toBe("FAIL");
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "ALLOCATION_REVENUE_DETAIL_REFERENCE_MISSING",
        "ALLOCATION_IDENTITY_REFERENCE_MISSING",
        "EXACT_GROUP_TARGET_MISSING",
      ])
    );
  });

  it("manifestの固定メタデータと合計の不一致を検出する", () => {
    const dataset = loadFixture();
    dataset.manifest.schemaVersion = "other-version";
    dataset.manifest.validation.status = "FAIL";
    dataset.programIdentities[0].amount_thousand_yen = 99;

    const result = validatePublicBudgetDataset(
      dataset,
      publicBudgetTestExpectations
    );

    expect(result.status).toBe("FAIL");
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "MANIFEST_SCHEMA_VERSION_MISMATCH",
        "MANIFEST_VALIDATION_STATUS_MISMATCH",
        "EXPENDITURE_TOTAL_MISMATCH",
      ])
    );
  });
});
