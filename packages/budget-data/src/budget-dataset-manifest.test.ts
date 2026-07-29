import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { BudgetAccountsConfig } from "./budget-accounts";
import {
  BUDGET_DATASET_GENERATED_COMMAND,
  BUDGET_DATASET_SCHEMA_VERSION,
  buildBudgetDatasetManifest,
  serializeBudgetDatasetManifest,
} from "./budget-dataset-manifest";
import { serializeBudgetItems, type BudgetItem } from "./budget-items";
import {
  serializeBudgetPrograms,
  type BudgetProgram,
} from "./budget-programs";
import {
  serializeBudgetSections,
  type BudgetSection,
} from "./budget-sections";

const temporaryDirectories: string[] = [];

const config: BudgetAccountsConfig = {
  fiscal_year: 2026,
  accounts: [
    {
      account_code: "general",
      account_name: "一般会計",
      account_type: "general",
      budget_side: "expenditure",
      csv_account_name: "一般会計",
      expected_amount_thousand_yen: 100,
      pdf_budget_book_start_page: 310,
      pdf_budget_book_end_page: 479,
      pdf_page_start: 159,
      pdf_page_end: 243,
      status: "active",
    },
  ],
};

const budgetItemKey = "2026_general_expenditure_01_01_01";

const program: BudgetProgram = {
  program_id: `${budgetItemKey}_01_01_01`,
  budget_item_key: budgetItemKey,
  fiscal_year: 2026,
  account_code: "general",
  account_name: "一般会計",
  budget_side: "expenditure",
  kan_code: "01",
  kan_name: "議会費",
  kou_code: "01",
  kou_name: "議会費",
  moku_code: "01",
  moku_name: "議会費",
  major_program_name: "大事業",
  budget_program_name: "予算事業",
  detail_program_name: "内訳事業",
  department_name: "区議会事務局",
  amount_thousand_yen: 100,
  general_revenue_thousand_yen: 100,
  allocated_revenue_thousand_yen: 0,
  major_program_code: "01",
  budget_program_code: "01",
  detail_program_code: "01",
  budget_program_group_id: `${budgetItemKey}_01_01`,
  source_type: "official_csv",
  source_file: "ippansaisyutu.csv",
  source_row_number: 1,
  is_zero_amount: false,
  funding_data_status: "raw_source_only",
  department_display_name: "区議会事務局",
  department_mapping_status: "already_display",
};

const section: BudgetSection = {
  section_id: `bs_${budgetItemKey}_01`,
  budget_item_key: budgetItemKey,
  fiscal_year: 2026,
  account_code: "general",
  account_name: "一般会計",
  budget_side: "expenditure",
  kan_code: "01",
  kan_name: "議会費",
  kou_code: "01",
  kou_name: "議会費",
  moku_code: "01",
  moku_name: "議会費",
  setsu_code: "01",
  setsu_name: "報酬",
  amount_thousand_yen: 100,
  budget_book_page: 311,
  pdf_page: 159,
  source_file: "r8tousyoyosanallpage.pdf",
  source_type: "official_pdf",
};

const item: BudgetItem = {
  budget_item_key: budgetItemKey,
  fiscal_year: 2026,
  account_code: "general",
  account_name: "一般会計",
  budget_side: "expenditure",
  kan_code: "01",
  kan_name: "議会費",
  kou_code: "01",
  kou_name: "議会費",
  moku_code: "01",
  moku_name: "議会費",
  program_total_amount_thousand_yen: 100,
  section_total_amount_thousand_yen: 100,
  diff_amount_thousand_yen: 0,
  validation_status: "ok",
  program_row_count: 1,
  section_row_count: 1,
  source_type: "derived",
  is_zero_amount: false,
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("budget dataset manifest", () => {
  it("入力ハッシュ・行列数・合計を決定論的に出力する", async () => {
    const repoRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "budget-manifest-"),
    );
    temporaryDirectories.push(repoRoot);
    await Promise.all([
      fs.mkdir(path.join(repoRoot, "raw"), { recursive: true }),
      fs.mkdir(path.join(repoRoot, "config"), { recursive: true }),
      fs.mkdir(path.join(repoRoot, "processed", "core"), {
        recursive: true,
      }),
    ]);
    await Promise.all([
      fs.writeFile(
        path.join(repoRoot, "raw", "ippansaisyutu.csv"),
        "official csv",
      ),
      fs.writeFile(
        path.join(repoRoot, "raw", "ippansainyu.csv"),
        "official revenue csv",
      ),
      fs.writeFile(
        path.join(repoRoot, "raw", "r8tousyoyosanallpage.pdf"),
        "official pdf",
      ),
      fs.writeFile(
        path.join(repoRoot, "config", "budget-accounts.json"),
        JSON.stringify(config),
      ),
      fs.writeFile(
        path.join(repoRoot, "config", "department_name_map.csv"),
        "department_name_raw,parent_department_display_name," +
          "section_display_name,department_display_name," +
          "mapping_status,mapping_source,mapping_note\n" +
          "区議会事務局,区議会事務局,,区議会事務局," +
          "already_display,official_csv,テスト\n",
      ),
      fs.writeFile(
        path.join(repoRoot, "processed", "core", "budget_programs.csv"),
        serializeBudgetPrograms([program]),
      ),
      fs.writeFile(
        path.join(repoRoot, "processed", "core", "budget_sections.csv"),
        serializeBudgetSections([section]),
      ),
      fs.writeFile(
        path.join(repoRoot, "processed", "core", "budget_items.csv"),
        serializeBudgetItems([item]),
      ),
    ]);

    const manifest = await buildBudgetDatasetManifest(
      repoRoot,
      config,
      { includeRevenue: false },
    );
    const serialized = serializeBudgetDatasetManifest(manifest);

    expect(manifest.schema_version).toBe(BUDGET_DATASET_SCHEMA_VERSION);
    expect(manifest.output_row_counts).toEqual({
      "processed/core/budget_programs.csv": 1,
      "processed/core/budget_sections.csv": 1,
      "processed/core/budget_items.csv": 1,
    });
    expect(manifest.output_column_counts).toEqual({
      "processed/core/budget_programs.csv": 30,
      "processed/core/budget_sections.csv": 19,
      "processed/core/budget_items.csv": 19,
    });
    expect(manifest.account_totals).toEqual({ general: 100 });
    expect(manifest.overall_total_amount_thousand_yen).toBe(100);
    expect(manifest.generated_command).toBe(
      BUDGET_DATASET_GENERATED_COMMAND,
    );
    expect(Object.values(manifest.input_file_hashes)).toEqual([
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
    ]);
    expect(manifest.revenue).toBeUndefined();
    expect(serialized).not.toContain("generated_at");
    expect(serialized).toBe(
      serializeBudgetDatasetManifest(manifest),
    );
  });
});
