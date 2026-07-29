import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  publicBudgetTestExpectations,
  writePublicBudgetTestFixture,
} from "./public-budget-test-fixture";
import {
  type PublicBudgetDatasetReadError,
  readPublicBudgetDataset,
} from "./read-public-budget-files";
import { validatePublicBudgetDataset } from "./validate-public-budget-files";

const temporaryDirectories: string[] = [];

function makeTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "public-budget-validator-")
  );
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("readPublicBudgetDataset", () => {
  it("manifestと6データファイルを読み込む", () => {
    const fixture = writePublicBudgetTestFixture(makeTemporaryDirectory());

    const dataset = readPublicBudgetDataset({
      inputDirectory: fixture.inputDirectory,
    });

    expect(dataset.programIdentities).toHaveLength(1);
    expect(dataset.programs).toHaveLength(1);
    expect(dataset.budgetItems).toHaveLength(1);
    expect(dataset.revenueDetails).toHaveLength(1);
    expect(dataset.revenueItems).toHaveLength(1);
    expect(dataset.revenueAllocations).toHaveLength(1);
    expect(dataset.files.every((file) => file.expectedSha256)).toBe(true);
  });

  it("ブラウザが付けた番号付きファイル名をmanifest hashで解決する", () => {
    const fixture = writePublicBudgetTestFixture(makeTemporaryDirectory(), {
      suffixes: {
        "public_dataset_manifest.json": 1,
        "public_budget_program_identities.csv": 2,
        "public_budget_programs.csv": 2,
        "public_budget_items.json": 2,
        "public_budget_revenue_details.csv": 2,
        "public_budget_revenue_items.json": 2,
        "public_budget_revenue_allocations.json": 2,
      },
    });

    const dataset = readPublicBudgetDataset({
      inputDirectory: fixture.inputDirectory,
    });

    expect(dataset.manifestFileName).toBe("public_dataset_manifest (1).json");
    expect(
      dataset.files.every((file) => file.actualFileName.includes(" (2)"))
    ).toBe(true);
  });

  it("実ファイルのhash変更を検証エラーとして残す", () => {
    const fixture = writePublicBudgetTestFixture(makeTemporaryDirectory());
    fs.appendFileSync(
      fixture.actualFilePaths["public_budget_programs.csv"],
      "\n",
      "utf8"
    );

    const dataset = readPublicBudgetDataset({
      inputDirectory: fixture.inputDirectory,
    });
    const result = validatePublicBudgetDataset(
      dataset,
      publicBudgetTestExpectations
    );

    expect(result.status).toBe("FAIL");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "FILE_HASH_MISMATCH" }),
      ])
    );
  });

  it("manifest候補が複数なら明示指定を要求する", () => {
    const fixture = writePublicBudgetTestFixture(makeTemporaryDirectory());
    fs.copyFileSync(
      fixture.actualFilePaths["public_dataset_manifest.json"],
      path.join(fixture.inputDirectory, "public_dataset_manifest (1).json")
    );

    expect(() =>
      readPublicBudgetDataset({ inputDirectory: fixture.inputDirectory })
    ).toThrowError(
      expect.objectContaining<Partial<PublicBudgetDatasetReadError>>({
        code: "MANIFEST_AMBIGUOUS",
      })
    );

    const dataset = readPublicBudgetDataset({
      inputDirectory: fixture.inputDirectory,
      manifestPath: "public_dataset_manifest.json",
    });
    expect(dataset.programs).toHaveLength(1);
  });

  it("JSONスキーマ違反を読み込み時に拒否する", () => {
    const fixture = writePublicBudgetTestFixture(makeTemporaryDirectory());
    const allocationPath =
      fixture.actualFilePaths["public_budget_revenue_allocations.json"];
    const allocations = JSON.parse(fs.readFileSync(allocationPath, "utf8"));
    allocations[0].allocationAmountThousandYen = 100;
    fs.writeFileSync(
      allocationPath,
      `${JSON.stringify(allocations, null, 2)}\n`,
      "utf8"
    );

    expect(() =>
      readPublicBudgetDataset({ inputDirectory: fixture.inputDirectory })
    ).toThrowError(
      expect.objectContaining<Partial<PublicBudgetDatasetReadError>>({
        code: "SCHEMA_VALIDATION_FAILED",
      })
    );
  });
});
