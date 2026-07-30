import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  publicBudgetProgramHeaders,
  publicBudgetProgramIdentityHeaders,
  publicBudgetRevenueDetailHeaders,
} from "./public-budget-dataset-schemas";
import {
  type PublicBudgetLogicalFileName,
  publicBudgetLogicalFileNames,
  publicBudgetManifestLogicalFileName,
} from "./read-public-budget-files";
import type { PublicBudgetDatasetExpectations } from "./validate-public-budget-files";

export const publicBudgetTestExpectations: PublicBudgetDatasetExpectations = {
  schemaVersion: "public-budget-v1",
  fiscalYear: 2026,
  datasetKind: "public_budget",
  budgetType: "initial_budget",
  currencyUnit: "thousand_yen",
  counts: {
    programIdentities: 1,
    programs: 1,
    budgetItems: 1,
    revenueDetails: 1,
    revenueItems: 1,
    revenueAllocations: 1,
    exactGroupAllocations: 1,
    publicIdentityAllocations: 0,
    allocationAmountNonNull: 0,
  },
  totals: {
    expenditure: 100,
    revenue: 100,
  },
  accountTotals: {
    general: 100,
    national_health_insurance: 0,
    latter_stage_elderly_healthcare: 0,
    long_term_care_insurance: 0,
    school_lunch_fee: 0,
  },
};

type FixtureFileName =
  | PublicBudgetLogicalFileName
  | typeof publicBudgetManifestLogicalFileName;

export interface WritePublicBudgetFixtureOptions {
  suffixes?: Partial<Record<FixtureFileName, number>>;
}

export interface PublicBudgetFixture {
  inputDirectory: string;
  actualFilePaths: Record<FixtureFileName, string>;
}

function fileNameWithSuffix(fileName: string, suffix?: number): string {
  if (suffix === undefined) {
    return fileName;
  }
  const parsed = path.parse(fileName);
  return `${parsed.name} (${suffix})${parsed.ext}`;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function csvLine(values: Array<string | number | boolean>): string {
  return `${values.map(String).join(",")}\n`;
}

export function writePublicBudgetTestFixture(
  inputDirectory: string,
  options: WritePublicBudgetFixtureOptions = {}
): PublicBudgetFixture {
  fs.mkdirSync(inputDirectory, { recursive: true });
  const actualFilePaths = {} as Record<FixtureFileName, string>;
  const fixtureFileNames: FixtureFileName[] = [
    ...publicBudgetLogicalFileNames,
    publicBudgetManifestLogicalFileName,
  ];

  for (const logicalFileName of fixtureFileNames) {
    actualFilePaths[logicalFileName] = path.join(
      inputDirectory,
      fileNameWithSuffix(logicalFileName, options.suffixes?.[logicalFileName])
    );
  }

  fs.writeFileSync(
    actualFilePaths["public_budget_program_identities.csv"],
    `${csvLine([...publicBudgetProgramIdentityHeaders]).trimEnd()}\n${csvLine([
      "bpi_test",
      2026,
      "general",
      "一般会計",
      "expenditure",
      "2026_general_expenditure_01_01_01",
      "01",
      "款",
      "01",
      "項",
      "01",
      "目",
      "テスト事業",
      "テスト部 テスト課",
      100,
      1,
      1,
      1,
      false,
      false,
      "derived_public",
    ])}`,
    "utf8"
  );

  fs.writeFileSync(
    actualFilePaths["public_budget_programs.csv"],
    `${csvLine([...publicBudgetProgramHeaders]).trimEnd()}\n${csvLine([
      "program_test",
      "2026_general_expenditure_01_01_01",
      2026,
      "general",
      "一般会計",
      "01",
      "款",
      "01",
      "項",
      "01",
      "目",
      "大事業",
      "テスト事業",
      "内訳事業",
      "テスト部 テスト課",
      100,
      false,
      "official_csv",
      "ippansaisyutu.csv",
      1,
      "bpi_test",
    ])}`,
    "utf8"
  );

  fs.writeFileSync(
    actualFilePaths["public_budget_items.json"],
    `${JSON.stringify(
      [
        {
          budgetItemKey: "2026_general_expenditure_01_01_01",
          fiscalYear: 2026,
          accountCode: "general",
          accountName: "一般会計",
          budgetSide: "expenditure",
          kan: { code: "01", name: "款" },
          kou: { code: "01", name: "項" },
          moku: { code: "01", name: "目" },
          amountThousandYen: 100,
          validationStatus: "ok",
          programs: [
            {
              programId: "program_test",
              majorProgramName: "大事業",
              budgetProgramName: "テスト事業",
              detailProgramName: "内訳事業",
              departmentDisplayName: "テスト部 テスト課",
              amountThousandYen: 100,
              isZeroAmount: false,
              sourceReference: {
                sourceType: "official_csv",
                sourceFile: "ippansaisyutu.csv",
                sourceRowNumber: 1,
              },
            },
          ],
          sections: [
            {
              sectionId: "section_test",
              setsuCode: "01",
              setsuName: "テスト節",
              amountThousandYen: 100,
              scope: "budget_item",
              sourceReference: {
                sourceType: "official_pdf",
                sourceFile: "r8tousyoyosanallpage.pdf",
                pdfPage: 1,
                budgetBookPage: 1,
              },
            },
          ],
          dataAvailability: {
            funding: "pending_revenue_phase",
            actualSpending: "not_available",
            settlement: "not_available",
            contracts: "not_available",
            vendors: "not_available",
            programSectionMapping: "not_available",
          },
          sourceReferences: [
            { sourceType: "derived" },
            {
              sourceType: "official_csv",
              sourceFile: "ippansaisyutu.csv",
              sourceRowNumber: 1,
            },
            {
              sourceType: "official_pdf",
              sourceFile: "r8tousyoyosanallpage.pdf",
              pdfPage: 1,
              budgetBookPage: 1,
            },
          ],
        },
      ],
      null,
      2
    )}\n`,
    "utf8"
  );

  fs.writeFileSync(
    actualFilePaths["public_budget_revenue_details.csv"],
    `${csvLine([...publicBudgetRevenueDetailHeaders]).trimEnd()}\n${csvLine([
      "revenue_detail_test",
      "revenue_section_test",
      "2026_general_revenue_01_01_01",
      2026,
      "general",
      "一般会計",
      "01",
      "歳入款",
      "01",
      "歳入項",
      "01",
      "歳入目",
      "01",
      "歳入節",
      "01",
      "歳入細節",
      "テスト部 テスト課",
      "一般財源",
      "general",
      90,
      100,
      10,
      false,
      1,
      "ippansainyu.csv",
      1,
    ])}`,
    "utf8"
  );

  fs.writeFileSync(
    actualFilePaths["public_budget_revenue_items.json"],
    `${JSON.stringify(
      [
        {
          revenueItemKey: "2026_general_revenue_01_01_01",
          fiscalYear: 2026,
          accountCode: "general",
          accountName: "一般会計",
          kan: { code: "01", name: "歳入款" },
          kou: { code: "01", name: "歳入項" },
          moku: { code: "01", name: "歳入目" },
          previousAmountThousandYen: 90,
          currentAmountThousandYen: 100,
          diffAmountThousandYen: 10,
          revenueComposition: {
            generalRevenueThousandYen: 100,
            specificRevenueThousandYen: 0,
            specialAccountRevenueThousandYen: 0,
          },
          revenueSourceDisplay: {
            mode: "general_and_specific",
            entries: [
              { label: "一般財源", amountThousandYen: 100 },
              { label: "特定財源", amountThousandYen: 0 },
            ],
          },
          sections: [
            {
              revenueSectionId: "revenue_section_test",
              setsu: { code: "01", name: "歳入節" },
              previousAmountThousandYen: 90,
              currentAmountThousandYen: 100,
              diffAmountThousandYen: 10,
              detailCount: 1,
              validationStatus: "ok",
              sourceReference: { sourceType: "derived" },
            },
          ],
          details: [
            {
              revenueDetailId: "revenue_detail_test",
              revenueSectionId: "revenue_section_test",
              setsu: { code: "01", name: "歳入節" },
              saisetsu: { code: "01", name: "歳入細節" },
              departmentDisplayName: "テスト部 テスト課",
              sourceFundingCategoryName: "一般財源",
              fundingNature: "general",
              previousAmountThousandYen: 90,
              currentAmountThousandYen: 100,
              diffAmountThousandYen: 10,
              isZeroAmount: false,
              relatedProgramCount: 1,
              sourceReference: {
                sourceType: "official_csv",
                sourceFile: "ippansainyu.csv",
                sourceRowNumber: 1,
              },
            },
          ],
          dataAvailability: {
            actualRevenue: "not_available",
            settlement: "not_available",
            allocationAmounts: "not_available",
          },
          sourceReferences: [
            { sourceType: "derived" },
            {
              sourceType: "official_csv",
              sourceFile: "ippansainyu.csv",
              sourceRowNumber: 1,
            },
          ],
        },
      ],
      null,
      2
    )}\n`,
    "utf8"
  );

  fs.writeFileSync(
    actualFilePaths["public_budget_revenue_allocations.json"],
    `${JSON.stringify(
      [
        {
          allocationLinkId: "allocation_test",
          revenueDetailId: "revenue_detail_test",
          targetBudgetProgramGroupId: "program_group_test",
          targetBudgetProgramIdentityId: "bpi_test",
          targetBudgetItemKey: "2026_general_expenditure_01_01_01",
          targetAccountCode: "general",
          targetProgramName: "テスト事業",
          targetBudgetBookPage: 1,
          targetResolutionLevel: "exact_group",
          candidateTargetGroupCount: 1,
          relationType: "allocated_to_program",
          allocationAmountThousandYen: null,
          amountAttributionStatus: "not_available",
          sourceReference: {
            sourceType: "official_pdf",
            sourceFile: "r8tousyoyosanallpage.pdf",
            pdfPage: 1,
            budgetBookPage: 1,
          },
        },
      ],
      null,
      2
    )}\n`,
    "utf8"
  );

  const fileMetadata = {
    "public_budget_program_identities.csv": {
      format: "csv",
      rowCount: 1,
      columnCount: publicBudgetProgramIdentityHeaders.length,
      role: "public_expenditure_program_identity_master",
    },
    "public_budget_programs.csv": {
      format: "csv",
      rowCount: 1,
      columnCount: publicBudgetProgramHeaders.length,
      role: "public_expenditure_program_detail_records",
    },
    "public_budget_items.json": {
      format: "json",
      itemCount: 1,
      role: "public_expenditure_budget_item_read_model",
    },
    "public_budget_revenue_details.csv": {
      format: "csv",
      rowCount: 1,
      columnCount: publicBudgetRevenueDetailHeaders.length,
      role: "public_revenue_detail_records",
    },
    "public_budget_revenue_items.json": {
      format: "json",
      itemCount: 1,
      role: "public_revenue_budget_item_read_model",
    },
    "public_budget_revenue_allocations.json": {
      format: "json",
      itemCount: 1,
      role: "public_revenue_expenditure_relation_read_model",
    },
  } as const;

  const manifest = {
    schemaVersion: "public-budget-v1",
    fiscalYear: 2026,
    datasetKind: "public_budget",
    budgetType: "initial_budget",
    currencyUnit: "thousand_yen",
    generatedCommand: "pnpm budget:public:manifest",
    publicFiles: publicBudgetLogicalFileNames.map((logicalFileName) => ({
      path: `processed/public/${logicalFileName}`,
      sha256: sha256(actualFilePaths[logicalFileName]),
      ...fileMetadata[logicalFileName],
      requiredForProduction: true,
    })),
    totals: {
      expenditureTotalAmountThousandYen: 100,
      revenueTotalAmountThousandYen: 100,
    },
    accountTotals: [
      {
        account_code: "general",
        account_name: "一般会計",
        expenditure_amount_thousand_yen: 100,
        revenue_amount_thousand_yen: 100,
      },
      {
        account_code: "national_health_insurance",
        account_name: "国民健康保険事業会計",
        expenditure_amount_thousand_yen: 0,
        revenue_amount_thousand_yen: 0,
      },
      {
        account_code: "latter_stage_elderly_healthcare",
        account_name: "後期高齢者医療会計",
        expenditure_amount_thousand_yen: 0,
        revenue_amount_thousand_yen: 0,
      },
      {
        account_code: "long_term_care_insurance",
        account_name: "介護保険事業会計",
        expenditure_amount_thousand_yen: 0,
        revenue_amount_thousand_yen: 0,
      },
      {
        account_code: "school_lunch_fee",
        account_name: "学校給食費会計",
        expenditure_amount_thousand_yen: 0,
        revenue_amount_thousand_yen: 0,
      },
    ],
    counts: {
      publicBudgetProgramIdentityCount: 1,
      publicBudgetProgramCount: 1,
      publicBudgetItemCount: 1,
      publicBudgetRevenueDetailCount: 1,
      publicBudgetRevenueItemCount: 1,
      publicBudgetRevenueAllocationCount: 1,
      exactGroupAllocationCount: 1,
      publicIdentityAllocationCount: 0,
      allocationAmountNonNullCount: 0,
      zeroAmountRevenueDetailCount: 0,
      zeroAmountRevenueItemCount: 0,
      zeroAmountProgramIdentityCount: 0,
    },
    validation: {
      status: "PASS",
      errors: [],
    },
  };

  fs.writeFileSync(
    actualFilePaths[publicBudgetManifestLogicalFileName],
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  return {
    inputDirectory,
    actualFilePaths,
  };
}
