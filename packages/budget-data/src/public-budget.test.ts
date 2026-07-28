import { stringify } from "csv-stringify/sync";
import { describe, expect, it } from "vitest";
import {
  BUDGET_AI_CONSTRAINTS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
  buildBudgetAiContext,
  buildPublicBudgetReadModel,
  classifyBudgetQuestionAvailability,
  getPublicBudgetItemDetail,
  searchPublicBudgetPrograms,
  serializePublicBudgetPrograms,
  validatePublicBudgetProgramCsv,
} from "./public-budget";

function rowsToCsv(
  rows: Array<Record<string, string | number | boolean>>,
): string {
  return stringify(rows, {
    columns: Object.keys(rows[0]),
    header: true,
    record_delimiter: "unix",
  });
}

function buildFixture() {
  const firstKey = "2026_general_expenditure_01_01_01";
  const secondKey = "2026_general_expenditure_01_01_02";
  const programsCsv = rowsToCsv([
    {
      program_id: "program_1",
      budget_item_key: firstKey,
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      kan_code: "01",
      kan_name: "款",
      kou_code: "01",
      kou_name: "項",
      moku_code: "01",
      moku_name: "目1",
      major_program_name: "大事業",
      budget_program_name: "予算事業",
      detail_program_name: "公開対象事業",
      department_name: "内部＊略称課",
      amount_thousand_yen: 100,
      source_type: "official_csv",
      source_file: "ippansaisyutu.csv",
      source_row_number: 1,
      is_zero_amount: "false",
    },
    {
      program_id: "program_2",
      budget_item_key: secondKey,
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      kan_code: "01",
      kan_name: "款",
      kou_code: "01",
      kou_name: "項",
      moku_code: "02",
      moku_name: "目2",
      major_program_name: "大事業",
      budget_program_name: "予算事業",
      detail_program_name: "0円事業",
      department_name: "内部＊略称課",
      amount_thousand_yen: 0,
      source_type: "official_csv",
      source_file: "ippansaisyutu.csv",
      source_row_number: 2,
      is_zero_amount: "true",
    },
  ]);
  const sectionsCsv = rowsToCsv([
    {
      section_id: "section_1",
      budget_item_key: firstKey,
      setsu_code: "01",
      setsu_name: "報酬",
      amount_thousand_yen: 100,
      source_file: "r8tousyoyosanallpage.pdf",
      pdf_page: 159,
      budget_book_page: 310,
      source_type: "official_pdf",
    },
  ]);
  const itemsCsv = rowsToCsv([
    {
      budget_item_key: firstKey,
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      budget_side: "expenditure",
      kan_code: "01",
      kan_name: "款",
      kou_code: "01",
      kou_name: "項",
      moku_code: "01",
      moku_name: "目1",
      program_total_amount_thousand_yen: 100,
      section_total_amount_thousand_yen: 100,
      validation_status: "ok",
      program_row_count: 1,
      section_row_count: 1,
      source_type: "derived",
    },
    {
      budget_item_key: secondKey,
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      budget_side: "expenditure",
      kan_code: "01",
      kan_name: "款",
      kou_code: "01",
      kou_name: "項",
      moku_code: "02",
      moku_name: "目2",
      program_total_amount_thousand_yen: 0,
      section_total_amount_thousand_yen: 0,
      validation_status: "ok_zero_amount",
      program_row_count: 1,
      section_row_count: 0,
      source_type: "derived",
    },
  ]);

  return {
    firstKey,
    secondKey,
    model: buildPublicBudgetReadModel(
      programsCsv,
      sectionsCsv,
      itemsCsv,
    ),
  };
}

describe("public budget read model", () => {
  it("部署表示列がなければ内部略称を転用せず空欄にする", () => {
    const { model } = buildFixture();

    expect(model.programs[0].department_display_name).toBe("");
    expect(
      model.budgetItems[0].programs[0].departmentDisplayName,
    ).toBeNull();
  });

  it("programsとsectionsをbudget item直下の兄弟配列にする", () => {
    const { model } = buildFixture();
    const item = model.budgetItems[0];

    expect(item.programs).toHaveLength(1);
    expect(item.sections).toHaveLength(1);
    expect(item.sections[0].scope).toBe("budget_item");
    expect("sections" in item.programs[0]).toBe(false);
    expect("programId" in item.sections[0]).toBe(false);
    expect(item.dataAvailability).toEqual({
      funding: "pending_revenue_phase",
      actualSpending: "not_available",
      settlement: "not_available",
      contracts: "not_available",
      vendors: "not_available",
      programSectionMapping: "not_available",
    });
  });

  it("公開CSVは許可20列だけを指定順で出力する", () => {
    const { model } = buildFixture();
    const csv = serializePublicBudgetPrograms(model.programs);

    expect(() => validatePublicBudgetProgramCsv(csv)).not.toThrow();
    expect(csv.split("\n")[0].split(",")).toEqual(
      PUBLIC_BUDGET_PROGRAM_COLUMNS,
    );
    expect(csv).not.toContain("general_revenue_thousand_yen");
    expect(csv).not.toContain("allocated_revenue_thousand_yen");
  });

  it("identity IDを末尾追加した21列公開CSVも検証できる", () => {
    const { model } = buildFixture();
    const csv = stringify(
      model.programs.map((program) => ({
        ...program,
        is_zero_amount: String(program.is_zero_amount),
        source_row_number: program.source_row_number ?? "",
        budget_program_identity_id: "bpi_test",
      })),
      {
        columns: [...PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY],
        header: true,
        record_delimiter: "unix",
      },
    );

    expect(() => validatePublicBudgetProgramCsv(csv)).not.toThrow();
    expect(() =>
      validatePublicBudgetProgramCsv(
        csv.replaceAll("bpi_test", ""),
      ),
    ).toThrow("budget_program_identity_idが空です");
  });

  it("0円事業を保持し、検索では既定除外・明示指定で表示する", () => {
    const { model } = buildFixture();

    expect(model.programs.filter((program) => program.is_zero_amount)).toHaveLength(
      1,
    );
    expect(
      searchPublicBudgetPrograms("0円事業", {
        programs: model.programs,
      }),
    ).toEqual([]);
    expect(
      searchPublicBudgetPrograms("0円事業", {
        programs: model.programs,
        includeZeroAmount: true,
      }).map((program) => program.program_id),
    ).toEqual(["program_2"]);
  });

  it("budgetItemKeyから目単位の詳細を取得する", () => {
    const { firstKey, model } = buildFixture();

    expect(
      getPublicBudgetItemDetail(firstKey, model.budgetItems),
    ).toEqual(model.budgetItems[0]);
    expect(
      getPublicBudgetItemDetail("unknown", model.budgetItems),
    ).toBeNull();
  });
});

describe("budget AI restrictions", () => {
  it.each([
    [
      "この事業の国費と一般財源はいくらですか",
      "FUNDING_DATA_PENDING_REVENUE_PHASE",
    ],
    [
      "この事業の委託料はいくらですか",
      "PROGRAM_SECTION_MAPPING_NOT_AVAILABLE",
    ],
    [
      "実際にいくら使われたのですか",
      "ACTUAL_SPENDING_NOT_AVAILABLE",
    ],
    ["決算額と不用額を教えて", "SETTLEMENT_DATA_NOT_AVAILABLE"],
    ["契約額はいくらですか", "CONTRACT_DATA_NOT_AVAILABLE"],
    ["どこの会社に支払うのですか", "VENDOR_DATA_NOT_AVAILABLE"],
  ] as const)(
    "回答不能質問「%s」にreason codeを返す",
    (query, reasonCode) => {
      expect(classifyBudgetQuestionAvailability(query)).toBe(reasonCode);
      expect(
        buildBudgetAiContext({
          query,
          programs: [],
          budgetItems: [],
        }),
      ).toEqual({
        answerable: false,
        reasonCode,
        message: expect.any(String),
      });
    },
  );

  it("回答可能な文脈へ3つの制約文を必ず含める", () => {
    const { model } = buildFixture();
    const result = buildBudgetAiContext({
      query: "目全体の委託料はいくらですか",
      programs: model.programs,
      budgetItems: model.budgetItems,
    });

    expect(result.answerable).toBe(true);
    if (result.answerable) {
      expect(result.context.constraints).toEqual(BUDGET_AI_CONSTRAINTS);
      expect(result.context.programs).toBe(model.programs);
      expect(result.context.budgetItems).toBe(model.budgetItems);
    }
  });
});
