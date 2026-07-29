import path from "node:path";
import type {
  PublicBudgetDataset,
  PublicBudgetLoadedFile,
  PublicBudgetLogicalFileName,
} from "./read-public-budget-files";

export interface PublicBudgetDatasetExpectations {
  schemaVersion: string;
  fiscalYear: number;
  datasetKind: string;
  budgetType: string;
  currencyUnit: string;
  counts: {
    programIdentities: number;
    programs: number;
    budgetItems: number;
    revenueDetails: number;
    revenueItems: number;
    revenueAllocations: number;
    exactGroupAllocations: number;
    publicIdentityAllocations: number;
    allocationAmountNonNull: number;
  };
  totals: {
    expenditure: number;
    revenue: number;
  };
  accountTotals: Record<string, number>;
}

export const publicBudgetDatasetExpectations: PublicBudgetDatasetExpectations =
  {
    schemaVersion: "public-budget-v1",
    fiscalYear: 2026,
    datasetKind: "public_budget",
    budgetType: "initial_budget",
    currencyUnit: "thousand_yen",
    counts: {
      programIdentities: 1_156,
      programs: 1_170,
      budgetItems: 190,
      revenueDetails: 2_192,
      revenueItems: 175,
      revenueAllocations: 1_948,
      exactGroupAllocations: 1_909,
      publicIdentityAllocations: 39,
      allocationAmountNonNull: 0,
    },
    totals: {
      expenditure: 621_033_664,
      revenue: 621_033_664,
    },
    accountTotals: {
      general: 431_353_010,
      national_health_insurance: 84_206_905,
      latter_stage_elderly_healthcare: 29_414_796,
      long_term_care_insurance: 76_058_953,
      school_lunch_fee: 0,
    },
  };

const expectedManifestFiles: Record<
  PublicBudgetLogicalFileName,
  { format: "csv" | "json"; role: string }
> = {
  "public_budget_program_identities.csv": {
    format: "csv",
    role: "public_expenditure_program_identity_master",
  },
  "public_budget_programs.csv": {
    format: "csv",
    role: "public_expenditure_program_detail_records",
  },
  "public_budget_items.json": {
    format: "json",
    role: "public_expenditure_budget_item_read_model",
  },
  "public_budget_revenue_details.csv": {
    format: "csv",
    role: "public_revenue_detail_records",
  },
  "public_budget_revenue_items.json": {
    format: "json",
    role: "public_revenue_budget_item_read_model",
  },
  "public_budget_revenue_allocations.json": {
    format: "json",
    role: "public_revenue_expenditure_relation_read_model",
  },
};

export interface PublicBudgetValidationIssue {
  code: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
}

export interface PublicBudgetValidationCounts {
  programIdentities: number;
  programs: number;
  budgetItems: number;
  revenueDetails: number;
  revenueItems: number;
  revenueAllocations: number;
}

export interface PublicBudgetValidationTotals {
  programIdentityExpenditure: number;
  programExpenditure: number;
  budgetItemExpenditure: number;
  revenueDetail: number;
  revenueItem: number;
}

export interface PublicBudgetValidationRelations {
  missingProgramIdentityReferences: number;
  missingBudgetItemProgramReferences: number;
  missingAllocationRevenueDetailReferences: number;
  missingAllocationProgramIdentityReferences: number;
  exactGroupAllocations: number;
  publicIdentityAllocations: number;
  allocationAmountNonNull: number;
  invalidAmountAttributionStatuses: number;
}

export interface PublicBudgetValidationSummary {
  manifestFileName: string;
  schemaVersion: string;
  fiscalYear: number;
  datasetKind: string;
  budgetType: string;
  currencyUnit: string;
  files: PublicBudgetLoadedFile[];
  counts: PublicBudgetValidationCounts;
  totals: PublicBudgetValidationTotals;
  accountTotals: Record<string, { expenditure: number; revenue: number }>;
  relations: PublicBudgetValidationRelations;
}

export interface PublicBudgetValidationResult {
  status: "PASS" | "FAIL";
  issues: PublicBudgetValidationIssue[];
  summary?: PublicBudgetValidationSummary;
}

function addMismatch(
  issues: PublicBudgetValidationIssue[],
  code: string,
  message: string,
  expected: string | number,
  actual: string | number
): void {
  if (expected === actual) {
    return;
  }
  issues.push({ code, message, expected, actual });
}

function addReferenceIssue(
  issues: PublicBudgetValidationIssue[],
  code: string,
  label: string,
  missingIds: string[]
): void {
  if (missingIds.length === 0) {
    return;
  }
  issues.push({
    code,
    message: `${label}が${missingIds.length}件あります: ${missingIds
      .slice(0, 5)
      .join(", ")}`,
    expected: 0,
    actual: missingIds.length,
  });
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
}

function addUniquenessIssue(
  issues: PublicBudgetValidationIssue[],
  code: string,
  label: string,
  values: string[]
): void {
  const duplicates = duplicateValues(values);
  if (duplicates.length === 0) {
    return;
  }
  issues.push({
    code,
    message: `${label}の重複が${duplicates.length}種類あります: ${duplicates
      .slice(0, 5)
      .join(", ")}`,
    expected: 0,
    actual: duplicates.length,
  });
}

function sumByAccount<T>(
  rows: T[],
  accountCode: (row: T) => string,
  amount: (row: T) => number
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const code = accountCode(row);
    totals[code] = (totals[code] ?? 0) + amount(row);
  }
  return totals;
}

function sumAmounts<T>(rows: T[], amount: (row: T) => number): number {
  return rows.reduce((total, row) => total + amount(row), 0);
}

function validateManifestFileSet(
  dataset: PublicBudgetDataset,
  issues: PublicBudgetValidationIssue[]
): void {
  addMismatch(
    issues,
    "MANIFEST_PUBLIC_FILE_COUNT_MISMATCH",
    "manifestのpublicFiles件数が一致しません",
    Object.keys(expectedManifestFiles).length,
    dataset.manifest.publicFiles.length
  );

  const entries = new Map(
    dataset.manifest.publicFiles.map((entry) => [
      path.basename(entry.path),
      entry,
    ])
  );
  for (const [logicalFileName, expected] of Object.entries(
    expectedManifestFiles
  )) {
    const entry = entries.get(logicalFileName);
    if (!entry) {
      issues.push({
        code: "MANIFEST_FILE_MISSING",
        message: `manifestに必須ファイルがありません: ${logicalFileName}`,
      });
      continue;
    }
    addMismatch(
      issues,
      "MANIFEST_FILE_FORMAT_MISMATCH",
      `${logicalFileName} のformatが一致しません`,
      expected.format,
      entry.format
    );
    addMismatch(
      issues,
      "MANIFEST_FILE_ROLE_MISMATCH",
      `${logicalFileName} のroleが一致しません`,
      expected.role,
      entry.role
    );
  }

  const unexpectedFiles = [...entries.keys()].filter(
    (fileName) => !(fileName in expectedManifestFiles)
  );
  if (unexpectedFiles.length > 0) {
    issues.push({
      code: "MANIFEST_UNEXPECTED_FILES",
      message: `manifestに対象外ファイルがあります: ${unexpectedFiles.join(", ")}`,
      expected: 0,
      actual: unexpectedFiles.length,
    });
  }
}

function validateLoadedFiles(
  files: PublicBudgetLoadedFile[],
  issues: PublicBudgetValidationIssue[]
): void {
  for (const file of files) {
    addMismatch(
      issues,
      "FILE_HASH_MISMATCH",
      `${file.logicalFileName} のSHA-256がmanifestと一致しません`,
      file.expectedSha256,
      file.actualSha256
    );
    addMismatch(
      issues,
      "FILE_COUNT_MISMATCH",
      `${file.logicalFileName} の件数がmanifestと一致しません`,
      file.expectedCount,
      file.actualCount
    );
    if (
      file.expectedColumnCount !== undefined &&
      file.actualColumnCount !== undefined
    ) {
      addMismatch(
        issues,
        "FILE_COLUMN_COUNT_MISMATCH",
        `${file.logicalFileName} の列数がmanifestと一致しません`,
        file.expectedColumnCount,
        file.actualColumnCount
      );
    }
  }
}

function validateManifestCounts(
  dataset: PublicBudgetDataset,
  expectations: PublicBudgetDatasetExpectations,
  issues: PublicBudgetValidationIssue[]
): void {
  const manifestCounts = dataset.manifest.counts;
  const expected = expectations.counts;
  const checks = [
    [
      "publicBudgetProgramIdentityCount",
      expected.programIdentities,
      manifestCounts.publicBudgetProgramIdentityCount,
    ],
    [
      "publicBudgetProgramCount",
      expected.programs,
      manifestCounts.publicBudgetProgramCount,
    ],
    [
      "publicBudgetItemCount",
      expected.budgetItems,
      manifestCounts.publicBudgetItemCount,
    ],
    [
      "publicBudgetRevenueDetailCount",
      expected.revenueDetails,
      manifestCounts.publicBudgetRevenueDetailCount,
    ],
    [
      "publicBudgetRevenueItemCount",
      expected.revenueItems,
      manifestCounts.publicBudgetRevenueItemCount,
    ],
    [
      "publicBudgetRevenueAllocationCount",
      expected.revenueAllocations,
      manifestCounts.publicBudgetRevenueAllocationCount,
    ],
    [
      "exactGroupAllocationCount",
      expected.exactGroupAllocations,
      manifestCounts.exactGroupAllocationCount,
    ],
    [
      "publicIdentityAllocationCount",
      expected.publicIdentityAllocations,
      manifestCounts.publicIdentityAllocationCount,
    ],
    [
      "allocationAmountNonNullCount",
      expected.allocationAmountNonNull,
      manifestCounts.allocationAmountNonNullCount,
    ],
  ] as const;

  for (const [name, expectedValue, actualValue] of checks) {
    addMismatch(
      issues,
      "MANIFEST_COUNT_MISMATCH",
      `manifest.counts.${name} が期待値と一致しません`,
      expectedValue,
      actualValue
    );
  }
}

function validateActualCounts(
  counts: PublicBudgetValidationCounts,
  expectations: PublicBudgetDatasetExpectations,
  issues: PublicBudgetValidationIssue[]
): void {
  const expected = expectations.counts;
  const checks = [
    [
      "program identities",
      expected.programIdentities,
      counts.programIdentities,
    ],
    ["programs", expected.programs, counts.programs],
    ["budget items", expected.budgetItems, counts.budgetItems],
    ["revenue details", expected.revenueDetails, counts.revenueDetails],
    ["revenue items", expected.revenueItems, counts.revenueItems],
    [
      "revenue allocations",
      expected.revenueAllocations,
      counts.revenueAllocations,
    ],
  ] as const;

  for (const [label, expectedValue, actualValue] of checks) {
    addMismatch(
      issues,
      "ACTUAL_COUNT_MISMATCH",
      `${label} の実件数が期待値と一致しません`,
      expectedValue,
      actualValue
    );
  }
}

function validateTotals(
  dataset: PublicBudgetDataset,
  totals: PublicBudgetValidationTotals,
  expectations: PublicBudgetDatasetExpectations,
  issues: PublicBudgetValidationIssue[]
): void {
  const expenditureChecks = [
    ["manifest", dataset.manifest.totals.expenditureTotalAmountThousandYen],
    ["program identities", totals.programIdentityExpenditure],
    ["programs", totals.programExpenditure],
    ["budget items", totals.budgetItemExpenditure],
  ] as const;
  for (const [label, actual] of expenditureChecks) {
    addMismatch(
      issues,
      "EXPENDITURE_TOTAL_MISMATCH",
      `${label} の歳出合計が期待値と一致しません`,
      expectations.totals.expenditure,
      actual
    );
  }

  const revenueChecks = [
    ["manifest", dataset.manifest.totals.revenueTotalAmountThousandYen],
    ["revenue details", totals.revenueDetail],
    ["revenue items", totals.revenueItem],
  ] as const;
  for (const [label, actual] of revenueChecks) {
    addMismatch(
      issues,
      "REVENUE_TOTAL_MISMATCH",
      `${label} の歳入合計が期待値と一致しません`,
      expectations.totals.revenue,
      actual
    );
  }
}

function validateAccountTotals(
  dataset: PublicBudgetDataset,
  expenditureByAccount: Record<string, number>,
  revenueByAccount: Record<string, number>,
  expectations: PublicBudgetDatasetExpectations,
  issues: PublicBudgetValidationIssue[]
): void {
  const manifestTotals = new Map<
    string,
    (typeof dataset.manifest.accountTotals)[number]
  >(
    dataset.manifest.accountTotals.map((account) => [
      account.account_code,
      account,
    ])
  );

  for (const [accountCode, expected] of Object.entries(
    expectations.accountTotals
  )) {
    addMismatch(
      issues,
      "ACCOUNT_EXPENDITURE_TOTAL_MISMATCH",
      `${accountCode} の歳出合計が期待値と一致しません`,
      expected,
      expenditureByAccount[accountCode] ?? 0
    );
    addMismatch(
      issues,
      "ACCOUNT_REVENUE_TOTAL_MISMATCH",
      `${accountCode} の歳入合計が期待値と一致しません`,
      expected,
      revenueByAccount[accountCode] ?? 0
    );

    const manifestAccount = manifestTotals.get(accountCode);
    if (!manifestAccount) {
      issues.push({
        code: "MANIFEST_ACCOUNT_MISSING",
        message: `manifest.accountTotalsに会計がありません: ${accountCode}`,
      });
      continue;
    }
    addMismatch(
      issues,
      "MANIFEST_ACCOUNT_EXPENDITURE_MISMATCH",
      `${accountCode} のmanifest歳出合計が期待値と一致しません`,
      expected,
      manifestAccount.expenditure_amount_thousand_yen
    );
    addMismatch(
      issues,
      "MANIFEST_ACCOUNT_REVENUE_MISMATCH",
      `${accountCode} のmanifest歳入合計が期待値と一致しません`,
      expected,
      manifestAccount.revenue_amount_thousand_yen
    );
  }
}

function validateRowFiscalYears(
  dataset: PublicBudgetDataset,
  fiscalYear: number,
  issues: PublicBudgetValidationIssue[]
): void {
  const invalidRows = [
    ...dataset.programIdentities.map((row) => row.fiscal_year),
    ...dataset.programs.map((row) => row.fiscal_year),
    ...dataset.budgetItems.map((row) => row.fiscalYear),
    ...dataset.revenueDetails.map((row) => row.fiscal_year),
    ...dataset.revenueItems.map((row) => row.fiscalYear),
  ].filter((year) => year !== fiscalYear);
  addMismatch(
    issues,
    "ROW_FISCAL_YEAR_MISMATCH",
    "データ行の年度が期待値と一致しません",
    0,
    invalidRows.length
  );
}

function buildSummary(
  dataset: PublicBudgetDataset
): PublicBudgetValidationSummary {
  const counts = {
    programIdentities: dataset.programIdentities.length,
    programs: dataset.programs.length,
    budgetItems: dataset.budgetItems.length,
    revenueDetails: dataset.revenueDetails.length,
    revenueItems: dataset.revenueItems.length,
    revenueAllocations: dataset.revenueAllocations.length,
  };
  const totals = {
    programIdentityExpenditure: sumAmounts(
      dataset.programIdentities,
      (row) => row.amount_thousand_yen
    ),
    programExpenditure: sumAmounts(
      dataset.programs,
      (row) => row.amount_thousand_yen
    ),
    budgetItemExpenditure: sumAmounts(
      dataset.budgetItems,
      (row) => row.amountThousandYen
    ),
    revenueDetail: sumAmounts(
      dataset.revenueDetails,
      (row) => row.current_amount_thousand_yen
    ),
    revenueItem: sumAmounts(
      dataset.revenueItems,
      (row) => row.currentAmountThousandYen
    ),
  };

  const expenditureByAccount = sumByAccount(
    dataset.programIdentities,
    (row) => row.account_code,
    (row) => row.amount_thousand_yen
  );
  const revenueByAccount = sumByAccount(
    dataset.revenueDetails,
    (row) => row.account_code,
    (row) => row.current_amount_thousand_yen
  );
  const accountCodes = new Set([
    ...Object.keys(expenditureByAccount),
    ...Object.keys(revenueByAccount),
  ]);
  const accountTotals = Object.fromEntries(
    [...accountCodes].sort().map((accountCode) => [
      accountCode,
      {
        expenditure: expenditureByAccount[accountCode] ?? 0,
        revenue: revenueByAccount[accountCode] ?? 0,
      },
    ])
  );

  const identityIds = new Set(
    dataset.programIdentities.map((row) => row.budget_program_identity_id)
  );
  const programIds = new Set(dataset.programs.map((row) => row.program_id));
  const revenueDetailIds = new Set(
    dataset.revenueDetails.map((row) => row.revenue_detail_id)
  );
  const nestedProgramIds = dataset.budgetItems.flatMap((item) =>
    item.programs.map((program) => program.programId)
  );

  const relations = {
    missingProgramIdentityReferences: dataset.programs.filter(
      (row) => !identityIds.has(row.budget_program_identity_id)
    ).length,
    missingBudgetItemProgramReferences: nestedProgramIds.filter(
      (programId) => !programIds.has(programId)
    ).length,
    missingAllocationRevenueDetailReferences: dataset.revenueAllocations.filter(
      (allocation) => !revenueDetailIds.has(allocation.revenueDetailId)
    ).length,
    missingAllocationProgramIdentityReferences:
      dataset.revenueAllocations.filter(
        (allocation) =>
          !identityIds.has(allocation.targetBudgetProgramIdentityId)
      ).length,
    exactGroupAllocations: dataset.revenueAllocations.filter(
      (allocation) => allocation.targetResolutionLevel === "exact_group"
    ).length,
    publicIdentityAllocations: dataset.revenueAllocations.filter(
      (allocation) => allocation.targetResolutionLevel === "public_identity"
    ).length,
    allocationAmountNonNull: dataset.revenueAllocations.filter(
      (allocation) => allocation.allocationAmountThousandYen !== null
    ).length,
    invalidAmountAttributionStatuses: dataset.revenueAllocations.filter(
      (allocation) => allocation.amountAttributionStatus !== "not_available"
    ).length,
  };

  return {
    manifestFileName: dataset.manifestFileName,
    schemaVersion: dataset.manifest.schemaVersion,
    fiscalYear: dataset.manifest.fiscalYear,
    datasetKind: dataset.manifest.datasetKind,
    budgetType: dataset.manifest.budgetType,
    currencyUnit: dataset.manifest.currencyUnit,
    files: dataset.files,
    counts,
    totals,
    accountTotals,
    relations,
  };
}

function validateReferences(
  dataset: PublicBudgetDataset,
  relations: PublicBudgetValidationRelations,
  issues: PublicBudgetValidationIssue[]
): void {
  const identityIds = new Set(
    dataset.programIdentities.map((row) => row.budget_program_identity_id)
  );
  const programIds = new Set(dataset.programs.map((row) => row.program_id));
  const budgetItemKeys = new Set(
    dataset.budgetItems.map((row) => row.budgetItemKey)
  );
  const revenueDetailIds = new Set(
    dataset.revenueDetails.map((row) => row.revenue_detail_id)
  );
  const revenueItemKeys = new Set(
    dataset.revenueItems.map((row) => row.revenueItemKey)
  );

  addReferenceIssue(
    issues,
    "PROGRAM_IDENTITY_REFERENCE_MISSING",
    "programから存在しないidentityへの参照",
    dataset.programs
      .filter((row) => !identityIds.has(row.budget_program_identity_id))
      .map((row) => row.program_id)
  );
  addReferenceIssue(
    issues,
    "BUDGET_ITEM_PROGRAM_REFERENCE_MISSING",
    "budget item内の存在しないprogram_id",
    dataset.budgetItems.flatMap((item) =>
      item.programs
        .filter((program) => !programIds.has(program.programId))
        .map((program) => program.programId)
    )
  );
  addReferenceIssue(
    issues,
    "PROGRAM_BUDGET_ITEM_REFERENCE_MISSING",
    "programから存在しないbudget itemへの参照",
    dataset.programs
      .filter((row) => !budgetItemKeys.has(row.budget_item_key))
      .map((row) => row.program_id)
  );
  addReferenceIssue(
    issues,
    "IDENTITY_BUDGET_ITEM_REFERENCE_MISSING",
    "identityから存在しないbudget itemへの参照",
    dataset.programIdentities
      .filter((row) => !budgetItemKeys.has(row.budget_item_key))
      .map((row) => row.budget_program_identity_id)
  );
  addReferenceIssue(
    issues,
    "ALLOCATION_REVENUE_DETAIL_REFERENCE_MISSING",
    "allocationから存在しないrevenue detailへの参照",
    dataset.revenueAllocations
      .filter((allocation) => !revenueDetailIds.has(allocation.revenueDetailId))
      .map((allocation) => allocation.allocationLinkId)
  );
  addReferenceIssue(
    issues,
    "ALLOCATION_IDENTITY_REFERENCE_MISSING",
    "allocationから存在しないidentityへの参照",
    dataset.revenueAllocations
      .filter(
        (allocation) =>
          !identityIds.has(allocation.targetBudgetProgramIdentityId)
      )
      .map((allocation) => allocation.allocationLinkId)
  );
  addReferenceIssue(
    issues,
    "REVENUE_DETAIL_ITEM_REFERENCE_MISSING",
    "revenue detailから存在しないrevenue itemへの参照",
    dataset.revenueDetails
      .filter((row) => !revenueItemKeys.has(row.revenue_item_key))
      .map((row) => row.revenue_detail_id)
  );

  const exactWithoutGroup = dataset.revenueAllocations.filter(
    (allocation) =>
      allocation.targetResolutionLevel === "exact_group" &&
      allocation.targetBudgetProgramGroupId === null
  );
  addMismatch(
    issues,
    "EXACT_GROUP_TARGET_MISSING",
    "exact_group関係のtargetBudgetProgramGroupId欠落件数が0ではありません",
    0,
    exactWithoutGroup.length
  );
  const publicIdentityWithGroup = dataset.revenueAllocations.filter(
    (allocation) =>
      allocation.targetResolutionLevel === "public_identity" &&
      allocation.targetBudgetProgramGroupId !== null
  );
  addMismatch(
    issues,
    "PUBLIC_IDENTITY_HAS_GROUP",
    "public_identity関係に内部groupが設定されています",
    0,
    publicIdentityWithGroup.length
  );

  addMismatch(
    issues,
    "ALLOCATION_AMOUNT_NON_NULL",
    "allocationAmountThousandYenがnullではない関係があります",
    0,
    relations.allocationAmountNonNull
  );
  addMismatch(
    issues,
    "ALLOCATION_ATTRIBUTION_STATUS_INVALID",
    "amountAttributionStatusがnot_availableではない関係があります",
    0,
    relations.invalidAmountAttributionStatuses
  );
}

function validateUniqueness(
  dataset: PublicBudgetDataset,
  issues: PublicBudgetValidationIssue[]
): void {
  addUniquenessIssue(
    issues,
    "DUPLICATE_PROGRAM_IDENTITY_ID",
    "budget_program_identity_id",
    dataset.programIdentities.map((row) => row.budget_program_identity_id)
  );
  addUniquenessIssue(
    issues,
    "DUPLICATE_PROGRAM_ID",
    "program_id",
    dataset.programs.map((row) => row.program_id)
  );
  addUniquenessIssue(
    issues,
    "DUPLICATE_BUDGET_ITEM_KEY",
    "budgetItemKey",
    dataset.budgetItems.map((row) => row.budgetItemKey)
  );
  addUniquenessIssue(
    issues,
    "DUPLICATE_REVENUE_DETAIL_ID",
    "revenue_detail_id",
    dataset.revenueDetails.map((row) => row.revenue_detail_id)
  );
  addUniquenessIssue(
    issues,
    "DUPLICATE_REVENUE_ITEM_KEY",
    "revenueItemKey",
    dataset.revenueItems.map((row) => row.revenueItemKey)
  );
  addUniquenessIssue(
    issues,
    "DUPLICATE_ALLOCATION_LINK_ID",
    "allocationLinkId",
    dataset.revenueAllocations.map((row) => row.allocationLinkId)
  );
}

export function validatePublicBudgetDataset(
  dataset: PublicBudgetDataset,
  expectations = publicBudgetDatasetExpectations
): PublicBudgetValidationResult {
  const issues: PublicBudgetValidationIssue[] = [];
  const summary = buildSummary(dataset);

  addMismatch(
    issues,
    "MANIFEST_SCHEMA_VERSION_MISMATCH",
    "manifest.schemaVersionが一致しません",
    expectations.schemaVersion,
    dataset.manifest.schemaVersion
  );
  addMismatch(
    issues,
    "MANIFEST_FISCAL_YEAR_MISMATCH",
    "manifest.fiscalYearが一致しません",
    expectations.fiscalYear,
    dataset.manifest.fiscalYear
  );
  addMismatch(
    issues,
    "MANIFEST_DATASET_KIND_MISMATCH",
    "manifest.datasetKindが一致しません",
    expectations.datasetKind,
    dataset.manifest.datasetKind
  );
  addMismatch(
    issues,
    "MANIFEST_BUDGET_TYPE_MISMATCH",
    "manifest.budgetTypeが一致しません",
    expectations.budgetType,
    dataset.manifest.budgetType
  );
  addMismatch(
    issues,
    "MANIFEST_CURRENCY_UNIT_MISMATCH",
    "manifest.currencyUnitが一致しません",
    expectations.currencyUnit,
    dataset.manifest.currencyUnit
  );
  addMismatch(
    issues,
    "MANIFEST_VALIDATION_STATUS_MISMATCH",
    "manifest.validation.statusがPASSではありません",
    "PASS",
    dataset.manifest.validation.status
  );
  addMismatch(
    issues,
    "MANIFEST_VALIDATION_ERRORS_NOT_EMPTY",
    "manifest.validation.errorsが空ではありません",
    0,
    dataset.manifest.validation.errors.length
  );

  validateManifestFileSet(dataset, issues);
  validateLoadedFiles(dataset.files, issues);
  validateManifestCounts(dataset, expectations, issues);
  validateActualCounts(summary.counts, expectations, issues);
  validateTotals(dataset, summary.totals, expectations, issues);
  validateAccountTotals(
    dataset,
    Object.fromEntries(
      Object.entries(summary.accountTotals).map(([accountCode, totals]) => [
        accountCode,
        totals.expenditure,
      ])
    ),
    Object.fromEntries(
      Object.entries(summary.accountTotals).map(([accountCode, totals]) => [
        accountCode,
        totals.revenue,
      ])
    ),
    expectations,
    issues
  );
  validateRowFiscalYears(dataset, expectations.fiscalYear, issues);
  validateReferences(dataset, summary.relations, issues);
  validateUniqueness(dataset, issues);

  addMismatch(
    issues,
    "EXACT_GROUP_COUNT_MISMATCH",
    "exact_group関係件数が一致しません",
    expectations.counts.exactGroupAllocations,
    summary.relations.exactGroupAllocations
  );
  addMismatch(
    issues,
    "PUBLIC_IDENTITY_COUNT_MISMATCH",
    "public_identity関係件数が一致しません",
    expectations.counts.publicIdentityAllocations,
    summary.relations.publicIdentityAllocations
  );
  addMismatch(
    issues,
    "ALLOCATION_AMOUNT_NON_NULL_COUNT_MISMATCH",
    "allocationAmountThousandYenの非null件数が一致しません",
    expectations.counts.allocationAmountNonNull,
    summary.relations.allocationAmountNonNull
  );

  return {
    status: issues.length === 0 ? "PASS" : "FAIL",
    issues,
    summary,
  };
}

export function createFailedPublicBudgetValidation(
  code: string,
  message: string
): PublicBudgetValidationResult {
  return {
    status: "FAIL",
    issues: [{ code, message }],
  };
}
