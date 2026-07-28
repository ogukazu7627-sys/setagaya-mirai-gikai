import { stringify } from "csv-stringify/sync";
import { describe, expect, it } from "vitest";
import { BUDGET_ITEM_COLUMNS } from "./budget-items";
import { BUDGET_PROGRAM_GROUP_COLUMNS } from "./budget-program-groups";
import {
  BUDGET_PROGRAM_IDENTITY_COLUMNS,
  BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
} from "./budget-program-identities";
import { BUDGET_PROGRAM_COLUMNS } from "./budget-programs";
import { DEPARTMENT_NAME_MAP_COLUMNS } from "./department-name-map";
import {
  PUBLIC_BUDGET_PROGRAM_COLUMNS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
} from "./public-budget";
import {
  PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS,
  buildPublicBudgetProgramIdentities,
  serializePublicBudgetProgramIdentities,
  validatePublicBudgetProgramIdentityCsv,
} from "./public-budget-program-identities";

function csv(
  columns: readonly string[],
  rows: Array<Record<string, string | number>>,
): string {
  return stringify(rows, {
    columns: [...columns],
    header: true,
    record_delimiter: "unix",
  });
}

function row(
  columns: readonly string[],
  values: Record<string, string | number>,
): Record<string, string | number> {
  return Object.fromEntries(
    columns.map((column) => [column, values[column] ?? ""]),
  );
}

function makeInput() {
  const identityId = "bpi_test";
  const firstGroupId =
    "2026_general_expenditure_01_01_01_01_01";
  const secondGroupId =
    "2026_general_expenditure_01_01_01_01_02";
  const itemKey = "2026_general_expenditure_01_01_01";
  const programValues = [
    {
      program_id: `${firstGroupId}_01`,
      budget_program_group_id: firstGroupId,
      amount_thousand_yen: 60,
    },
    {
      program_id: `${firstGroupId}_02`,
      budget_program_group_id: firstGroupId,
      amount_thousand_yen: 40,
    },
    {
      program_id: `${secondGroupId}_01`,
      budget_program_group_id: secondGroupId,
      amount_thousand_yen: 50,
    },
  ];
  const programs = programValues.map((program) =>
    row(BUDGET_PROGRAM_COLUMNS, {
      ...program,
      budget_item_key: itemKey,
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      budget_side: "expenditure",
      department_name: "財務部＊課税課",
    }),
  );
  const publicPrograms = programValues.map((program) =>
    row(PUBLIC_BUDGET_PROGRAM_COLUMNS, {
      program_id: program.program_id,
      budget_item_key: itemKey,
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      kan_code: "01",
      kan_name: "款",
      kou_code: "01",
      kou_name: "項",
      moku_code: "01",
      moku_name: "目",
      major_program_name: "大事業",
      budget_program_name: "予算事業",
      detail_program_name: "内訳事業",
      department_display_name: "財務部 課税課",
      amount_thousand_yen: program.amount_thousand_yen,
      is_zero_amount: "false",
      source_type: "official_csv",
      source_file: "source.csv",
      source_row_number: "1",
    }),
  );

  return {
    identitiesCsv: csv(BUDGET_PROGRAM_IDENTITY_COLUMNS, [
      row(BUDGET_PROGRAM_IDENTITY_COLUMNS, {
        budget_program_identity_id: identityId,
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        budget_item_key: itemKey,
        display_program_name: "予算事業",
        normalized_program_name: "予算事業",
        department_name: "財務部＊課税課",
        normalized_department_name: "財務部*課税課",
        candidate_budget_book_pages: "311",
        total_amount_thousand_yen: 150,
        member_group_count: 2,
        source_type: "derived",
      }),
    ]),
    identityMembersCsv: csv(
      BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
      [
        row(BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS, {
          budget_program_identity_id: identityId,
          budget_program_group_id: firstGroupId,
          budget_item_key: itemKey,
          major_program_name: "大事業",
          budget_program_name: "予算事業",
          department_name: "財務部＊課税課",
          amount_thousand_yen: 100,
          member_order: 1,
          source_type: "derived",
        }),
        row(BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS, {
          budget_program_identity_id: identityId,
          budget_program_group_id: secondGroupId,
          budget_item_key: itemKey,
          major_program_name: "大事業",
          budget_program_name: "予算事業",
          department_name: "財務部＊課税課",
          amount_thousand_yen: 50,
          member_order: 2,
          source_type: "derived",
        }),
      ],
    ),
    programGroupsCsv: csv(BUDGET_PROGRAM_GROUP_COLUMNS, [
      row(BUDGET_PROGRAM_GROUP_COLUMNS, {
        budget_program_group_id: firstGroupId,
        budget_item_key: itemKey,
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        major_program_name: "大事業",
        budget_program_name: "予算事業",
        department_name: "財務部＊課税課",
        total_amount_thousand_yen: 100,
        member_program_count: 2,
        candidate_budget_book_pages: "311",
        source_type: "derived",
      }),
      row(BUDGET_PROGRAM_GROUP_COLUMNS, {
        budget_program_group_id: secondGroupId,
        budget_item_key: itemKey,
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        major_program_name: "大事業",
        budget_program_name: "予算事業",
        department_name: "財務部＊課税課",
        total_amount_thousand_yen: 50,
        member_program_count: 1,
        candidate_budget_book_pages: "311",
        source_type: "derived",
      }),
    ]),
    programsCsv: csv(BUDGET_PROGRAM_COLUMNS, programs),
    itemsCsv: csv(BUDGET_ITEM_COLUMNS, [
      row(BUDGET_ITEM_COLUMNS, {
        budget_item_key: itemKey,
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        budget_side: "expenditure",
        kan_code: "01",
        kan_name: "款",
        kou_code: "01",
        kou_name: "項",
        moku_code: "01",
        moku_name: "目",
      }),
    ]),
    publicProgramsCsv: csv(
      PUBLIC_BUDGET_PROGRAM_COLUMNS,
      publicPrograms,
    ),
    publicRevenueAllocationsJson: JSON.stringify([
      {
        allocationLinkId: "ral_test_001",
        targetBudgetProgramIdentityId: identityId,
        targetBudgetProgramGroupId: firstGroupId,
        targetResolutionLevel: "exact_group",
      },
      {
        allocationLinkId: "ral_test_002",
        targetBudgetProgramIdentityId: identityId,
        targetBudgetProgramGroupId: null,
        targetResolutionLevel: "public_identity",
      },
    ]),
    departmentMapCsv: csv(DEPARTMENT_NAME_MAP_COLUMNS, [
      row(DEPARTMENT_NAME_MAP_COLUMNS, {
        department_name_raw: "財務部＊課税課",
        parent_department_display_name: "財務部",
        section_display_name: "課税課",
        department_display_name: "財務部 課税課",
        mapping_status: "already_display",
        mapping_source: "official_csv",
        mapping_note: "fixture",
      }),
    ]),
  };
}

describe("public budget program identities", () => {
  it("group、program、歳入関係をidentity単位へ安全に集約する", () => {
    const result = buildPublicBudgetProgramIdentities(makeInput(), {
      enforceProductionExpectations: false,
    });
    expect(result.validation.isPass).toBe(true);
    expect(result.identities).toEqual([
      expect.objectContaining({
        budget_program_identity_id: "bpi_test",
        amount_thousand_yen: 150,
        member_group_count: 2,
        member_program_count: 3,
        related_revenue_count: 2,
        has_public_identity_resolution: true,
        department_display_name: "財務部 課税課",
        source_type: "derived_public",
      }),
    ]);
  });

  it("公開identity CSVとprogramの末尾identity列を決定的に生成する", () => {
    const input = makeInput();
    const first = buildPublicBudgetProgramIdentities(input, {
      enforceProductionExpectations: false,
    });
    const identitiesCsv = serializePublicBudgetProgramIdentities(
      first.identities,
    );
    expect(() =>
      validatePublicBudgetProgramIdentityCsv(
        identitiesCsv,
        first.identities,
      ),
    ).not.toThrow();

    const second = buildPublicBudgetProgramIdentities(
      {
        ...input,
        publicProgramsCsv: first.publicProgramsCsv,
      },
      { enforceProductionExpectations: false },
    );
    expect(second.publicProgramsCsv).toBe(first.publicProgramsCsv);
    expect(first.publicProgramsCsv.split("\n")[0].split(",")).toEqual(
      PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
    );
    expect(identitiesCsv.split("\n")[0].split(",")).toEqual(
      PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS,
    );
  });

  it("存在しないidentityを参照するallocationを拒否する", () => {
    const input = makeInput();
    expect(() =>
      buildPublicBudgetProgramIdentities(
        {
          ...input,
          publicRevenueAllocationsJson: JSON.stringify([
            {
              allocationLinkId: "ral_test_missing",
              targetBudgetProgramIdentityId: "bpi_missing",
              targetBudgetProgramGroupId: null,
              targetResolutionLevel: "public_identity",
            },
          ]),
        },
        { enforceProductionExpectations: false },
      ),
    ).toThrow("allocationのidentityが存在しません");
  });
});
