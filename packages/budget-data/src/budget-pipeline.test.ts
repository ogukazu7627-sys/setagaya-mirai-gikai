import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { beforeAll, describe, expect, it } from "vitest";
import {
  parseBudgetAccountsConfig,
  type BudgetAccountsConfig,
} from "./budget-accounts";
import {
  BUDGET_BUILD_OUTPUTS,
  BUDGET_BUILD_PHASES,
} from "./budget-pipeline";
import { VALIDATION_ERROR_COLUMNS } from "./budget-validation";

type CsvRow = Record<string, string>;

const EXPECTED_ACCOUNT_TOTALS = {
  general: 431_353_010,
  national_health_insurance: 84_206_905,
  latter_stage_elderly_healthcare: 29_414_796,
  long_term_care_insurance: 76_058_953,
  school_lunch_fee: 0,
} as const;
const EXPECTED_ALL_ACCOUNT_TOTAL = 621_033_664;
const repoRoot = path.resolve(import.meta.dirname, "../../..");

let config: BudgetAccountsConfig;
let programs: CsvRow[];
let sections: CsvRow[];
let items: CsvRow[];
let validationErrorTable: string[][];

function parseCsvRecords(csvText: string): CsvRow[] {
  return parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as CsvRow[];
}

function accountTotals(
  rows: CsvRow[],
  amountColumn: string,
): Record<string, number> {
  const totals = Object.fromEntries(
    Object.keys(EXPECTED_ACCOUNT_TOTALS).map((accountCode) => [
      accountCode,
      0,
    ]),
  ) as Record<string, number>;
  for (const row of rows) {
    totals[row.account_code] += Number(row[amountColumn]);
  }
  return totals;
}

beforeAll(async () => {
  const [
    configText,
    programsCsv,
    sectionsCsv,
    itemsCsv,
    validationErrorsCsv,
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
    fs.readFile(
      path.join(repoRoot, "processed", "validation", "validation_errors.csv"),
      "utf8",
    ),
  ]);

  config = parseBudgetAccountsConfig(configText);
  programs = parseCsvRecords(programsCsv);
  sections = parseCsvRecords(sectionsCsv);
  items = parseCsvRecords(itemsCsv);
  validationErrorTable = parse(validationErrorsCsv, {
    bom: true,
    skip_empty_lines: true,
  }) as string[][];
});

describe("all-account budget build manifest", () => {
  it("要求された順番で9成果物を生成する", () => {
    expect(BUDGET_BUILD_PHASES.map((phase) => phase.script)).toEqual([
      "build:programs",
      "build:raw-sections:general",
      "build:raw-sections:special",
      "build:sections",
      "build:items",
      "validate:all",
      "build:manifest",
    ]);
    expect(BUDGET_BUILD_OUTPUTS).toEqual([
      "processed/core/budget_programs.csv",
      "docs/department_mapping_report.md",
      "processed/audit/raw_pdf_sections.csv",
      "processed/audit/raw_pdf_sections_special.csv",
      "processed/core/budget_sections.csv",
      "processed/core/budget_items.csv",
      "processed/validation/validation_errors.csv",
      "docs/validation/validation_report.md",
      "processed/validation/dataset_manifest.json",
    ]);
  });

  it("processed直下をpublic・core・audit・validationに分離する", async () => {
    const entries = await fs.readdir(path.join(repoRoot, "processed"), {
      withFileTypes: true,
    });
    expect(
      entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name),
    ).toEqual([]);
    expect(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort(),
    ).toEqual(["audit", "core", "public", "validation"]);
  });

  it("ルートpackage scriptsに公開コマンドがそろっている", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(Object.keys(packageJson.scripts)).toEqual(
      expect.arrayContaining([
        "budget:programs",
        "budget:raw-sections:general",
        "budget:raw-sections:special",
        "budget:sections",
        "budget:items",
        "budget:manifest",
        "budget:public",
        "budget:validate",
        "budget:build-all",
        "budget:expenditure:build-all",
      ]),
    );
    expect(packageJson.scripts["budget:build-all"]).toContain(
      "build:complete",
    );
    expect(packageJson.scripts["budget:public"]).toContain(
      "build:public-all",
    );
    expect(packageJson.scripts["budget:expenditure:build-all"]).toContain(
      "build:all",
    );
  });
});

describe("generated all-account budget data", () => {
  it("account_codeごとのprogram合計が正しい", () => {
    expect(accountTotals(programs, "amount_thousand_yen")).toEqual(
      EXPECTED_ACCOUNT_TOTALS,
    );
  });

  it("account_codeごとのsection合計が正しい", () => {
    expect(accountTotals(sections, "amount_thousand_yen")).toEqual(
      EXPECTED_ACCOUNT_TOTALS,
    );
    expect(
      sections.some((row) => row.account_code === "school_lunch_fee"),
    ).toBe(false);
  });

  it("全会計のprogram合計とsection合計が621,033,664である", () => {
    const programTotal = programs.reduce(
      (total, row) => total + Number(row.amount_thousand_yen),
      0,
    );
    const sectionTotal = sections.reduce(
      (total, row) => total + Number(row.amount_thousand_yen),
      0,
    );

    expect(programTotal).toBe(EXPECTED_ALL_ACCOUNT_TOTAL);
    expect(sectionTotal).toBe(EXPECTED_ALL_ACCOUNT_TOTAL);
  });

  it("一般会計だけに絞るとPhase 6の既存結果と一致する", () => {
    const generalPrograms = programs.filter(
      (row) => row.account_code === "general",
    );
    const generalSections = sections.filter(
      (row) => row.account_code === "general",
    );
    const generalItems = items.filter(
      (row) => row.account_code === "general",
    );
    const statusCounts = generalItems.reduce<Record<string, number>>(
      (counts, row) => {
        counts[row.validation_status] =
          (counts[row.validation_status] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(generalPrograms).toHaveLength(1_077);
    expect(generalSections).toHaveLength(872);
    expect(generalItems).toHaveLength(128);
    expect(statusCounts).toEqual({ ok: 122, ok_zero_amount: 6 });
    expect(
      accountTotals(generalPrograms, "amount_thousand_yen").general,
    ).toBe(EXPECTED_ACCOUNT_TOTALS.general);
    expect(
      accountTotals(generalSections, "amount_thousand_yen").general,
    ).toBe(EXPECTED_ACCOUNT_TOTALS.general);
  });

  it("validation_statusはokまたはok_zero_amountだけである", () => {
    expect(
      new Set(items.map((row) => row.validation_status)),
    ).toEqual(new Set(["ok", "ok_zero_amount"]));
  });

  it("validation_errors.csvはヘッダーのみである", () => {
    expect(validationErrorTable).toEqual([[...VALIDATION_ERROR_COLUMNS]]);
  });

  it("program_idとsection_idが全行で一意である", () => {
    expect(new Set(programs.map((row) => row.program_id)).size).toBe(
      programs.length,
    );
    expect(new Set(sections.map((row) => row.section_id)).size).toBe(
      sections.length,
    );
  });

  it("budget_item_keyが全会計で衝突せず指定形式に一致する", () => {
    const accountCodes = config.accounts
      .map((account) => account.account_code)
      .join("|");
    const keyPattern = new RegExp(
      `^2026_(${accountCodes})_expenditure_\\d{2}_\\d{2}_\\d{2}$`,
    );
    const sourceRows = [...programs, ...sections];

    for (const row of sourceRows) {
      expect(row.budget_item_key).toMatch(keyPattern);
      expect(row.budget_item_key).toMatch(
        new RegExp(
          `^2026_${row.account_code}_expenditure_`,
        ),
      );
    }

    const itemKeys = items.map((row) => row.budget_item_key);
    const sourceKeyUnion = new Set(
      sourceRows.map((row) => row.budget_item_key),
    );
    expect(new Set(itemKeys).size).toBe(itemKeys.length);
    expect(new Set(itemKeys)).toEqual(sourceKeyUnion);
  });
});
