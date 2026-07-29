import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { beforeAll, describe, expect, it } from "vitest";
import type { BudgetDatasetManifest } from "./budget-dataset-manifest";
import {
  BUDGET_REVENUE_BUILD_OUTPUTS,
  BUDGET_REVENUE_BUILD_PHASES,
  BUDGET_REVENUE_POSTFLIGHT_PHASE,
  BUDGET_REVENUE_PUBLIC_POSTFLIGHT_PHASE,
} from "./budget-revenue-pipeline";
import { REVENUE_VALIDATION_ERROR_COLUMNS } from "./budget-revenue-validation";
import { REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS } from "./revenue-allocation-validation";

type CsvRow = Record<string, string>;

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const EXPECTED_EXPENDITURE_HASHES = {
  "processed/core/budget_programs.csv":
    "6ae0a0fda94e2498be8749688cdab3427f3d1d54520b3e952152265672b81a27",
  "processed/core/budget_sections.csv":
    "5616dc3e29949fd8cf83128ea017b252f78587f8486d4091014d60ee7a1e2ad0",
  "processed/core/budget_items.csv":
    "a7edcf294bfd4256401ae396c63758f2fe28a0ffbd6fe26f3788fd35526b6822",
} as const;
const EXPECTED_ACCOUNT_TOTALS = {
  general: 431_353_010,
  national_health_insurance: 84_206_905,
  latter_stage_elderly_healthcare: 29_414_796,
  long_term_care_insurance: 76_058_953,
  school_lunch_fee: 0,
} as const;

let programs: CsvRow[];
let sections: CsvRow[];
let items: CsvRow[];
let revenueDetails: CsvRow[];
let revenueSections: CsvRow[];
let revenueItems: CsvRow[];
let coreValidationErrors: string[][];
let allocationValidationErrors: string[][];
let manifest: BudgetDatasetManifest;

function parseCsvRecords(csvText: string): CsvRow[] {
  return parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as CsvRow[];
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sum(
  rows: CsvRow[],
  column: string,
  predicate: (row: CsvRow) => boolean = () => true,
): number {
  return rows
    .filter(predicate)
    .reduce((total, row) => total + Number(row[column]), 0);
}

beforeAll(async () => {
  const [
    programsCsv,
    sectionsCsv,
    itemsCsv,
    detailsCsv,
    revenueSectionsCsv,
    revenueItemsCsv,
    coreErrorsCsv,
    allocationErrorsCsv,
    manifestJson,
  ] = await Promise.all([
    fs.readFile(path.join(repoRoot, "processed", "core", "budget_programs.csv"), "utf8"),
    fs.readFile(path.join(repoRoot, "processed", "core", "budget_sections.csv"), "utf8"),
    fs.readFile(path.join(repoRoot, "processed", "core", "budget_items.csv"), "utf8"),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_revenue_details.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_revenue_sections.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_revenue_items.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "validation", "revenue_validation_errors.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed", "validation", "revenue_allocation_validation_errors.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "validation", "dataset_manifest.json"),
      "utf8",
    ),
  ]);
  programs = parseCsvRecords(programsCsv);
  sections = parseCsvRecords(sectionsCsv);
  items = parseCsvRecords(itemsCsv);
  revenueDetails = parseCsvRecords(detailsCsv);
  revenueSections = parseCsvRecords(revenueSectionsCsv);
  revenueItems = parseCsvRecords(revenueItemsCsv);
  coreValidationErrors = parse(coreErrorsCsv, {
    bom: true,
    skip_empty_lines: true,
  }) as string[][];
  allocationValidationErrors = parse(allocationErrorsCsv, {
    bom: true,
    skip_empty_lines: true,
  }) as string[][];
  manifest = JSON.parse(manifestJson) as BudgetDatasetManifest;
});

describe("Phase 32 revenue build pipeline", () => {
  it("公開生成12工程の後にコア・公開manifestを順番に更新する", () => {
    expect(BUDGET_REVENUE_BUILD_PHASES.map((phase) => phase.script)).toEqual([
      "build:revenue-details",
      "build:revenue-sections",
      "build:revenue-items",
      "validate:revenue",
      "extract:pdf-revenue-allocations",
      "build:revenue-allocation-source-matches",
      "build:program-groups",
      "build:revenue-allocation-links",
      "validate:revenue-allocations",
      "build:public",
      "build:public-revenue",
      "build:public-program-identities",
    ]);
    expect(BUDGET_REVENUE_POSTFLIGHT_PHASE.script).toBe("build:manifest");
    expect(BUDGET_REVENUE_PUBLIC_POSTFLIGHT_PHASE.script).toBe(
      "build:public-manifest",
    );
    expect(
      BUDGET_REVENUE_BUILD_PHASES.some((phase) =>
        phase.script.includes("sample"),
      ),
    ).toBe(false);
    expect(BUDGET_REVENUE_BUILD_OUTPUTS).toContain(
      "processed/validation/dataset_manifest.json",
    );
    expect(BUDGET_REVENUE_BUILD_OUTPUTS).toContain(
      "processed/public/public_budget_program_identities.csv",
    );
    expect(BUDGET_REVENUE_BUILD_OUTPUTS).toContain(
      "processed/public/public_dataset_manifest.json",
    );
  });

  it("ルートpackage scriptsに指定された歳入コマンドがそろっている", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(Object.keys(packageJson.scripts)).toEqual(
      expect.arrayContaining([
        "budget:public:manifest",
        "budget:public:program-identities",
        "budget:revenue:details",
        "budget:revenue:sections",
        "budget:revenue:items",
        "budget:revenue:validate",
        "budget:revenue:allocations:sample",
        "budget:revenue:allocations:extended-sample",
        "budget:revenue:allocations:raw",
        "budget:revenue:allocations:match-source",
        "budget:revenue:allocations:link",
        "budget:revenue:allocations:validate",
        "budget:revenue:public",
        "budget:revenue:build-all",
      ]),
    );
  });
});

describe("Phase 32 expenditure regression", () => {
  it("歳出3CSVの固定ハッシュ・行数・ID・金額が変わらない", async () => {
    for (const [relativePath, expectedHash] of Object.entries(
      EXPECTED_EXPENDITURE_HASHES,
    )) {
      expect(
        sha256(await fs.readFile(path.join(repoRoot, relativePath))),
      ).toBe(expectedHash);
    }
    expect(programs).toHaveLength(1_170);
    expect(sections).toHaveLength(994);
    expect(items).toHaveLength(190);
    expect(new Set(programs.map((row) => row.program_id)).size).toBe(
      programs.length,
    );
    expect(new Set(sections.map((row) => row.section_id)).size).toBe(
      sections.length,
    );
    expect(new Set(items.map((row) => row.budget_item_key)).size).toBe(
      items.length,
    );
    expect(sum(programs, "amount_thousand_yen")).toBe(621_033_664);
    expect(sum(sections, "amount_thousand_yen")).toBe(621_033_664);
    expect(sum(items, "program_total_amount_thousand_yen")).toBe(
      621_033_664,
    );
    expect(sum(items, "section_total_amount_thousand_yen")).toBe(
      621_033_664,
    );
  });
});

describe("Phase 32 revenue regression", () => {
  it("歳入3テーブルの行数・会計別合計・全会計合計が正しい", () => {
    expect(revenueDetails).toHaveLength(2_192);
    expect(revenueSections).toHaveLength(650);
    expect(revenueItems).toHaveLength(175);
    for (const [accountCode, expected] of Object.entries(
      EXPECTED_ACCOUNT_TOTALS,
    )) {
      expect(
        sum(
          revenueDetails,
          "current_amount_thousand_yen",
          (row) => row.account_code === accountCode,
        ),
      ).toBe(expected);
    }
    expect(sum(revenueDetails, "current_amount_thousand_yen")).toBe(
      621_033_664,
    );
    expect(sum(revenueSections, "current_amount_thousand_yen")).toBe(
      621_033_664,
    );
    expect(sum(revenueItems, "current_amount_thousand_yen")).toBe(
      621_033_664,
    );
  });

  it("一般会計の一般財源・特定財源が正しい", () => {
    const isGeneral = (row: CsvRow) => row.account_code === "general";
    expect(
      sum(
        revenueItems,
        "general_revenue_thousand_yen",
        isGeneral,
      ),
    ).toBe(279_402_113);
    expect(
      sum(
        revenueItems,
        "specific_revenue_thousand_yen",
        isGeneral,
      ),
    ).toBe(151_950_897);
  });

  it("core validationとallocation validationはPASSでエラー0件", () => {
    expect(coreValidationErrors).toEqual([
      [...REVENUE_VALIDATION_ERROR_COLUMNS],
    ]);
    expect(allocationValidationErrors).toEqual([
      [...REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS],
    ]);
    expect(manifest.revenue?.validation_result).toEqual({
      core_validation: "PASS",
      allocation_validation: "PASS",
      core_error_count: 0,
      allocation_error_count: 0,
    });
  });

  it("manifestに歳入入力・出力・照合結果を固定する", () => {
    expect(manifest.schema_version).toBe("1.3.0");
    expect(manifest.revenue).toEqual(
      expect.objectContaining({
        input_file: "raw/ippansainyu.csv",
        overall_total_amount_thousand_yen: 621_033_664,
        allocation_relation_count: 1_948,
        source_match_result: {
          relation_count: 1_948,
          matched: 1_948,
          manually_confirmed: 0,
          ambiguous: 0,
          unmatched: 0,
        },
        target_match_result: {
          relation_count: 1_948,
          matched: 1_948,
          manually_confirmed: 0,
          ambiguous: 0,
          unmatched: 0,
          exact_group: 1_909,
          public_identity: 39,
        },
        generated_command: "pnpm budget:revenue:build-all",
      }),
    );
    expect(manifest.revenue?.output_row_counts).toEqual(
      expect.objectContaining({
        "processed/core/budget_revenue_details.csv": 2_192,
        "processed/core/budget_revenue_sections.csv": 650,
        "processed/core/budget_revenue_items.csv": 175,
        "processed/core/budget_revenue_allocations.csv": 1_948,
        "processed/validation/revenue_validation_errors.csv": 0,
        "processed/validation/revenue_allocation_validation_errors.csv": 0,
      }),
    );
  });
});
