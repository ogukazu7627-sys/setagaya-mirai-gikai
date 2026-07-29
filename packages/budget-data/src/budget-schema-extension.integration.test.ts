import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { beforeAll, describe, expect, it } from "vitest";
import {
  parseBudgetAccountsConfig,
  type BudgetAccountsConfig,
} from "./budget-accounts";
import type { BudgetDatasetManifest } from "./budget-dataset-manifest";
import {
  parseDepartmentNameMap,
  validateDepartmentMappingCoverage,
  type DepartmentNameMapping,
} from "./department-name-map";
import {
  BUDGET_ITEM_COLUMNS,
  BUDGET_ITEM_LEGACY_COLUMNS,
} from "./budget-items";
import {
  BUDGET_PROGRAM_COLUMNS,
  BUDGET_PROGRAM_LEGACY_COLUMNS,
  BUDGET_PROGRAM_PHASE_16_COLUMNS,
  decodeBudgetCsv,
  parseSourceBudgetRows,
  transformBudgetPrograms,
  validateBudgetProgramSourceTraceability,
  type BudgetProgram,
  type SourceBudgetRow,
} from "./budget-programs";
import {
  BUDGET_SECTION_COLUMNS,
  BUDGET_SECTION_LEGACY_COLUMNS,
} from "./budget-sections";

type CsvRow = Record<string, string>;

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const LEGACY_FILE_HASHES = {
  programs:
    "6fe5eb60d3d4a1ad023a237a95a45ed5c453e77442aa6b5e4a4a496c3fe5a11f",
  sections:
    "b313f4ba80faa060884c84f6071c2873d49412c6395f7ec15038cf4e73a87cdd",
  items:
    "d971f6120f9c9bc72db1a4c83fd9c071532b99fd05760d3aef718894cd9bb3a0",
} as const;
const PHASE_16_PROGRAM_HASH =
  "64baa260171b9f30d6b535957df27c6a3d7af187e2cc789b3ceb3137572cdd5c";

let config: BudgetAccountsConfig;
let programs: CsvRow[];
let sections: CsvRow[];
let items: CsvRow[];
let sourceRows: SourceBudgetRow[];
let departmentMappings: DepartmentNameMapping[];
let regeneratedPrograms: BudgetProgram[];
let manifest: BudgetDatasetManifest;

function parseCsvRecords(csvText: string): CsvRow[] {
  return parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as CsvRow[];
}

function legacyProjectionHash(
  rows: CsvRow[],
  columns: readonly string[],
): string {
  const csv = stringify(rows, {
    columns: [...columns],
    header: true,
    record_delimiter: "unix",
  });
  return createHash("sha256").update(csv).digest("hex");
}

beforeAll(async () => {
  const [
    configText,
    programsCsv,
    sectionsCsv,
    itemsCsv,
    sourceCsvBytes,
    departmentMappingText,
    manifestText,
  ] = await Promise.all([
    fs.readFile(
      path.join(repoRoot, "config", "budget-accounts.json"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_programs.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_sections.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_items.csv"),
      "utf8",
    ),
    fs.readFile(path.join(repoRoot, "raw", "ippansaisyutu.csv")),
    fs.readFile(
      path.join(repoRoot, "config", "department_name_map.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "validation", "dataset_manifest.json"),
      "utf8",
    ),
  ]);

  config = parseBudgetAccountsConfig(configText);
  programs = parseCsvRecords(programsCsv);
  sections = parseCsvRecords(sectionsCsv);
  items = parseCsvRecords(itemsCsv);
  sourceRows = parseSourceBudgetRows(decodeBudgetCsv(sourceCsvBytes).text);
  departmentMappings = parseDepartmentNameMap(departmentMappingText);
  regeneratedPrograms = transformBudgetPrograms(
    sourceRows,
    config,
    departmentMappings,
    "ippansaisyutu.csv",
  );
  manifest = JSON.parse(manifestText) as BudgetDatasetManifest;
});

describe("Phase 16 legacy data preservation", () => {
  it("既存列の値・行順を更新前ファイルのSHA-256で固定する", () => {
    expect(
      legacyProjectionHash(programs, BUDGET_PROGRAM_LEGACY_COLUMNS),
    ).toBe(LEGACY_FILE_HASHES.programs);
    expect(
      legacyProjectionHash(sections, BUDGET_SECTION_LEGACY_COLUMNS),
    ).toBe(LEGACY_FILE_HASHES.sections);
    expect(legacyProjectionHash(items, BUDGET_ITEM_LEGACY_COLUMNS)).toBe(
      LEGACY_FILE_HASHES.items,
    );
  });

  it("Phase 16の28列を全件変更しない", () => {
    expect(
      legacyProjectionHash(programs, BUDGET_PROGRAM_PHASE_16_COLUMNS),
    ).toBe(PHASE_16_PROGRAM_HASH);
  });

  it("既存列の末尾だけに拡張列を追加する", () => {
    expect(Object.keys(programs[0])).toEqual(BUDGET_PROGRAM_COLUMNS);
    expect(Object.keys(sections[0])).toEqual(BUDGET_SECTION_COLUMNS);
    expect(Object.keys(items[0])).toEqual(BUDGET_ITEM_COLUMNS);
  });
});

describe("Phase 16 budget_programs traceability", () => {
  it("指定件数・ID・0円・負数財源・固定値を満たす", () => {
    expect(programs).toHaveLength(1_170);
    expect(new Set(programs.map((row) => row.program_id)).size).toBe(
      1_170,
    );
    expect(
      new Set(programs.map((row) => row.budget_program_group_id)).size,
    ).toBe(1_166);
    expect(
      programs.filter((row) => row.is_zero_amount === "true"),
    ).toHaveLength(44);
    const negativeRevenueRows = programs.filter(
      (row) => Number(row.general_revenue_thousand_yen) < 0,
    );
    expect(negativeRevenueRows).toHaveLength(26);
    expect(
      negativeRevenueRows.every(
        (row) => row.funding_data_status === "raw_source_only",
      ),
    ).toBe(true);
    expect(
      programs.every(
        (row) =>
          row.source_type === "official_csv" &&
          row.source_file === "ippansaisyutu.csv" &&
          row.funding_data_status === "raw_source_only",
      ),
    ).toBe(true);
  });

  it("source_row_numberから公式CSVの既存19列を全件復元する", () => {
    const traceability = validateBudgetProgramSourceTraceability(
      regeneratedPrograms,
      sourceRows,
      config,
      "ippansaisyutu.csv",
    );
    const recoveredBySourceRow = new Map(
      regeneratedPrograms.map((program) => [
        String(program.source_row_number),
        program,
      ]),
    );

    expect(traceability).toEqual({
      rowCount: 1_170,
      recoveredSourceRowCount: 1_170,
      comparedColumnCount: 19,
    });
    for (const current of programs) {
      const recovered = recoveredBySourceRow.get(current.source_row_number);
      expect(recovered).toBeDefined();
      for (const column of BUDGET_PROGRAM_LEGACY_COLUMNS) {
        expect(String(recovered?.[column])).toBe(current[column]);
      }
    }
  });
});

describe("Phase 17 department display names", () => {
  it("136種類を単一表示名へマッピングしneeds_reviewを残さない", () => {
    const coverage = validateDepartmentMappingCoverage(
      programs.map((row) => row.department_name),
      departmentMappings,
    );
    const displaysByRaw = new Map<string, Set<string>>();
    for (const row of programs) {
      const displays =
        displaysByRaw.get(row.department_name) ?? new Set<string>();
      displays.add(row.department_display_name);
      displaysByRaw.set(row.department_name, displays);
    }

    expect(coverage).toEqual({
      mappingCount: 136,
      rawDepartmentNameCount: 136,
      statusCounts: {
        matched: 125,
        already_display: 11,
        needs_review: 0,
      },
      needsReviewCount: 0,
    });
    expect(
      [...displaysByRaw.values()].every(
        (displayNames) => displayNames.size === 1,
      ),
    ).toBe(true);
  });

  it("事業行へ設定どおりの表示名とstatusを付ける", () => {
    const mappingsByRaw = new Map(
      departmentMappings.map((mapping) => [
        mapping.department_name_raw,
        mapping,
      ]),
    );
    const statusCounts = programs.reduce<Record<string, number>>(
      (counts, row) => {
        counts[row.department_mapping_status] =
          (counts[row.department_mapping_status] ?? 0) + 1;
        const mapping = mappingsByRaw.get(row.department_name);
        expect(mapping).toBeDefined();
        expect(row.department_display_name).toBe(
          mapping?.department_display_name,
        );
        expect(row.department_mapping_status).toBe(
          mapping?.mapping_status,
        );
        return counts;
      },
      {},
    );

    expect(statusCounts).toEqual({
      already_display: 52,
      matched: 1_118,
    });
  });
});

describe("Phase 16 sections, items, and manifest", () => {
  it("budget_sectionsは994行でID一意・official_pdfである", () => {
    expect(sections).toHaveLength(994);
    expect(new Set(sections.map((row) => row.section_id)).size).toBe(994);
    expect(
      sections.every((row) => row.source_type === "official_pdf"),
    ).toBe(true);
  });

  it("budget_itemsは指定ステータスと0円件数を満たす", () => {
    const statusCounts = items.reduce<Record<string, number>>(
      (counts, row) => {
        counts[row.validation_status] =
          (counts[row.validation_status] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(items).toHaveLength(190);
    expect(statusCounts).toEqual({ ok: 180, ok_zero_amount: 10 });
    expect(
      items.filter((row) => row.is_zero_amount === "true"),
    ).toHaveLength(10);
    expect(items.every((row) => row.source_type === "derived")).toBe(true);
  });

  it("dataset_manifest.jsonに再現可能な固定メタデータを持つ", () => {
    expect(manifest).toEqual(
      expect.objectContaining({
        schema_version: "1.3.0",
        fiscal_year: 2026,
        output_row_counts: {
          "processed/core/budget_programs.csv": 1_170,
          "processed/core/budget_sections.csv": 994,
          "processed/core/budget_items.csv": 190,
        },
        output_column_counts: {
          "processed/core/budget_programs.csv": 30,
          "processed/core/budget_sections.csv": 19,
          "processed/core/budget_items.csv": 19,
        },
        account_totals: {
          general: 431_353_010,
          national_health_insurance: 84_206_905,
          latter_stage_elderly_healthcare: 29_414_796,
          long_term_care_insurance: 76_058_953,
          school_lunch_fee: 0,
        },
        overall_total_amount_thousand_yen: 621_033_664,
        generated_command: "pnpm budget:build-all",
      }),
    );
    expect(JSON.stringify(manifest)).not.toContain("generated_at");
    expect(manifest.input_file_hashes).toEqual({
      "raw/ippansaisyutu.csv":
        "c9aa48b12232671e1ee18e2ee2f808f1fd5e7e3731bf1ba0a4edb6f008c5e34d",
      "raw/ippansainyu.csv":
        "e13bceb14ffe232a184e853843e424a6c0dd27a41bbea85c6fce66f2509b8cc1",
      "raw/r8tousyoyosanallpage.pdf":
        "82a3dae90d26a627fa7b52a6ced49455e6a9f7ce8d8d943bfe852e9d47fd44d9",
      "config/budget-accounts.json":
        "46ea61c16aede648728abf9eeb965136f6fb5ef3b61709239d0d423c5f086737",
      "config/department_name_map.csv":
        "4951ea3aac3c98635d9607e508a7903e2b7188c3e4f8f1cfe696f13757b58ef4",
    });
    expect(manifest.revenue).toEqual(
      expect.objectContaining({
        input_file: "raw/ippansainyu.csv",
        input_file_hash:
          "e13bceb14ffe232a184e853843e424a6c0dd27a41bbea85c6fce66f2509b8cc1",
        account_totals: {
          general: 431_353_010,
          national_health_insurance: 84_206_905,
          latter_stage_elderly_healthcare: 29_414_796,
          long_term_care_insurance: 76_058_953,
          school_lunch_fee: 0,
        },
        overall_total_amount_thousand_yen: 621_033_664,
        general_account_revenue_composition: {
          general_revenue_thousand_yen: 279_402_113,
          specific_revenue_thousand_yen: 151_950_897,
        },
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
        validation_result: {
          core_validation: "PASS",
          allocation_validation: "PASS",
          core_error_count: 0,
          allocation_error_count: 0,
        },
        generated_command: "pnpm budget:revenue:build-all",
      }),
    );
  });
});
