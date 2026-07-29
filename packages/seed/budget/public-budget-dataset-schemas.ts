import { z } from "zod";

const integerSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const nonNegativeIntegerSchema = integerSchema.nonnegative();
const positiveIntegerSchema = integerSchema.positive();
const nonEmptyStringSchema = z.string().min(1);
const hierarchyCodeSchema = z.string().regex(/^\d{2}$/);

const csvIntegerSchema = z
  .string()
  .regex(/^-?\d+$/)
  .transform(Number)
  .pipe(integerSchema);
const csvNonNegativeIntegerSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(nonNegativeIntegerSchema);
const csvPositiveIntegerSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(positiveIntegerSchema);
const csvBooleanSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const budgetAccountCodeSchema = z.enum([
  "general",
  "national_health_insurance",
  "latter_stage_elderly_healthcare",
  "long_term_care_insurance",
  "school_lunch_fee",
]);

const hierarchySchema = z.strictObject({
  code: hierarchyCodeSchema,
  name: nonEmptyStringSchema,
});

export const officialCsvSourceReferenceSchema = z.strictObject({
  sourceType: z.literal("official_csv"),
  sourceFile: nonEmptyStringSchema,
  sourceRowNumber: positiveIntegerSchema,
});

export const officialPdfSourceReferenceSchema = z.strictObject({
  sourceType: z.literal("official_pdf"),
  sourceFile: nonEmptyStringSchema,
  pdfPage: positiveIntegerSchema,
  budgetBookPage: positiveIntegerSchema,
});

export const derivedSourceReferenceSchema = z.strictObject({
  sourceType: z.literal("derived"),
});

export const publicSourceReferenceSchema = z.discriminatedUnion("sourceType", [
  officialCsvSourceReferenceSchema,
  officialPdfSourceReferenceSchema,
  derivedSourceReferenceSchema,
]);

export const publicBudgetProgramIdentityHeaders = [
  "budget_program_identity_id",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_side",
  "budget_item_key",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "display_program_name",
  "department_display_name",
  "amount_thousand_yen",
  "member_group_count",
  "member_program_count",
  "related_revenue_count",
  "has_public_identity_resolution",
  "is_zero_amount",
  "source_type",
] as const;

export const publicBudgetProgramIdentityRowSchema = z.strictObject({
  budget_program_identity_id: nonEmptyStringSchema,
  fiscal_year: csvIntegerSchema,
  account_code: budgetAccountCodeSchema,
  account_name: nonEmptyStringSchema,
  budget_side: z.literal("expenditure"),
  budget_item_key: nonEmptyStringSchema,
  kan_code: hierarchyCodeSchema,
  kan_name: nonEmptyStringSchema,
  kou_code: hierarchyCodeSchema,
  kou_name: nonEmptyStringSchema,
  moku_code: hierarchyCodeSchema,
  moku_name: nonEmptyStringSchema,
  display_program_name: nonEmptyStringSchema,
  department_display_name: z.string(),
  amount_thousand_yen: csvIntegerSchema,
  member_group_count: csvNonNegativeIntegerSchema,
  member_program_count: csvNonNegativeIntegerSchema,
  related_revenue_count: csvNonNegativeIntegerSchema,
  has_public_identity_resolution: csvBooleanSchema,
  is_zero_amount: csvBooleanSchema,
  source_type: z.literal("derived_public"),
});

export const publicBudgetProgramHeaders = [
  "program_id",
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "major_program_name",
  "budget_program_name",
  "detail_program_name",
  "department_display_name",
  "amount_thousand_yen",
  "is_zero_amount",
  "source_type",
  "source_file",
  "source_row_number",
  "budget_program_identity_id",
] as const;

export const publicBudgetProgramRowSchema = z.strictObject({
  program_id: nonEmptyStringSchema,
  budget_item_key: nonEmptyStringSchema,
  fiscal_year: csvIntegerSchema,
  account_code: budgetAccountCodeSchema,
  account_name: nonEmptyStringSchema,
  kan_code: hierarchyCodeSchema,
  kan_name: nonEmptyStringSchema,
  kou_code: hierarchyCodeSchema,
  kou_name: nonEmptyStringSchema,
  moku_code: hierarchyCodeSchema,
  moku_name: nonEmptyStringSchema,
  major_program_name: nonEmptyStringSchema,
  budget_program_name: nonEmptyStringSchema,
  detail_program_name: nonEmptyStringSchema,
  department_display_name: z.string(),
  amount_thousand_yen: csvIntegerSchema,
  is_zero_amount: csvBooleanSchema,
  source_type: z.literal("official_csv"),
  source_file: nonEmptyStringSchema,
  source_row_number: csvPositiveIntegerSchema,
  budget_program_identity_id: nonEmptyStringSchema,
});

export const publicBudgetRevenueDetailHeaders = [
  "revenue_detail_id",
  "revenue_section_id",
  "revenue_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "setsu_code",
  "setsu_name",
  "saisetsu_code",
  "saisetsu_name",
  "department_display_name",
  "source_funding_category_name",
  "funding_nature",
  "previous_amount_thousand_yen",
  "current_amount_thousand_yen",
  "diff_amount_thousand_yen",
  "is_zero_amount",
  "related_program_count",
  "source_file",
  "source_row_number",
] as const;

export const publicBudgetRevenueDetailRowSchema = z.strictObject({
  revenue_detail_id: nonEmptyStringSchema,
  revenue_section_id: nonEmptyStringSchema,
  revenue_item_key: nonEmptyStringSchema,
  fiscal_year: csvIntegerSchema,
  account_code: budgetAccountCodeSchema,
  account_name: nonEmptyStringSchema,
  kan_code: hierarchyCodeSchema,
  kan_name: nonEmptyStringSchema,
  kou_code: hierarchyCodeSchema,
  kou_name: nonEmptyStringSchema,
  moku_code: hierarchyCodeSchema,
  moku_name: nonEmptyStringSchema,
  setsu_code: hierarchyCodeSchema,
  setsu_name: nonEmptyStringSchema,
  saisetsu_code: hierarchyCodeSchema,
  saisetsu_name: nonEmptyStringSchema,
  department_display_name: z.string(),
  source_funding_category_name: nonEmptyStringSchema,
  funding_nature: z.enum(["general", "specific", "special_account"]),
  previous_amount_thousand_yen: csvIntegerSchema,
  current_amount_thousand_yen: csvIntegerSchema,
  diff_amount_thousand_yen: csvIntegerSchema,
  is_zero_amount: csvBooleanSchema,
  related_program_count: csvNonNegativeIntegerSchema,
  source_file: nonEmptyStringSchema,
  source_row_number: csvPositiveIntegerSchema,
});

const publicBudgetItemProgramSchema = z.strictObject({
  programId: nonEmptyStringSchema,
  majorProgramName: nonEmptyStringSchema,
  budgetProgramName: nonEmptyStringSchema,
  detailProgramName: nonEmptyStringSchema,
  departmentDisplayName: z.string(),
  amountThousandYen: integerSchema,
  isZeroAmount: z.boolean(),
  sourceReference: officialCsvSourceReferenceSchema,
});

const publicBudgetItemSectionSchema = z.strictObject({
  sectionId: nonEmptyStringSchema,
  setsuCode: hierarchyCodeSchema,
  setsuName: nonEmptyStringSchema,
  amountThousandYen: integerSchema,
  scope: z.literal("budget_item"),
  sourceReference: officialPdfSourceReferenceSchema,
});

export const publicBudgetItemSchema = z.strictObject({
  budgetItemKey: nonEmptyStringSchema,
  fiscalYear: integerSchema,
  accountCode: budgetAccountCodeSchema,
  accountName: nonEmptyStringSchema,
  budgetSide: z.literal("expenditure"),
  kan: hierarchySchema,
  kou: hierarchySchema,
  moku: hierarchySchema,
  amountThousandYen: integerSchema,
  validationStatus: z.enum(["ok", "ok_zero_amount"]),
  programs: z.array(publicBudgetItemProgramSchema),
  sections: z.array(publicBudgetItemSectionSchema),
  dataAvailability: z.strictObject({
    funding: z.literal("pending_revenue_phase"),
    actualSpending: z.literal("not_available"),
    settlement: z.literal("not_available"),
    contracts: z.literal("not_available"),
    vendors: z.literal("not_available"),
    programSectionMapping: z.literal("not_available"),
  }),
  sourceReferences: z.array(publicSourceReferenceSchema),
});

export const publicBudgetItemsSchema = z.array(publicBudgetItemSchema);

const publicBudgetRevenueSectionSchema = z.strictObject({
  revenueSectionId: nonEmptyStringSchema,
  setsu: hierarchySchema,
  previousAmountThousandYen: integerSchema,
  currentAmountThousandYen: integerSchema,
  diffAmountThousandYen: integerSchema,
  detailCount: nonNegativeIntegerSchema,
  validationStatus: z.enum(["ok", "ok_zero_amount"]),
  sourceReference: derivedSourceReferenceSchema,
});

const publicBudgetRevenueDetailSchema = z.strictObject({
  revenueDetailId: nonEmptyStringSchema,
  revenueSectionId: nonEmptyStringSchema,
  setsu: hierarchySchema,
  saisetsu: hierarchySchema,
  departmentDisplayName: z.string(),
  sourceFundingCategoryName: nonEmptyStringSchema,
  fundingNature: z.enum(["general", "specific", "special_account"]),
  previousAmountThousandYen: integerSchema,
  currentAmountThousandYen: integerSchema,
  diffAmountThousandYen: integerSchema,
  isZeroAmount: z.boolean(),
  relatedProgramCount: nonNegativeIntegerSchema,
  sourceReference: officialCsvSourceReferenceSchema,
});

export const publicBudgetRevenueItemSchema = z.strictObject({
  revenueItemKey: nonEmptyStringSchema,
  fiscalYear: integerSchema,
  accountCode: budgetAccountCodeSchema,
  accountName: nonEmptyStringSchema,
  kan: hierarchySchema,
  kou: hierarchySchema,
  moku: hierarchySchema,
  previousAmountThousandYen: integerSchema,
  currentAmountThousandYen: integerSchema,
  diffAmountThousandYen: integerSchema,
  revenueComposition: z.strictObject({
    generalRevenueThousandYen: integerSchema,
    specificRevenueThousandYen: integerSchema,
    specialAccountRevenueThousandYen: integerSchema,
  }),
  revenueSourceDisplay: z.strictObject({
    mode: z.enum(["general_and_specific", "source_categories"]),
    entries: z.array(
      z.strictObject({
        label: nonEmptyStringSchema,
        amountThousandYen: integerSchema,
      })
    ),
  }),
  sections: z.array(publicBudgetRevenueSectionSchema),
  details: z.array(publicBudgetRevenueDetailSchema),
  dataAvailability: z.strictObject({
    actualRevenue: z.literal("not_available"),
    settlement: z.literal("not_available"),
    allocationAmounts: z.literal("not_available"),
  }),
  sourceReferences: z.array(
    z.discriminatedUnion("sourceType", [
      officialCsvSourceReferenceSchema,
      derivedSourceReferenceSchema,
    ])
  ),
});

export const publicBudgetRevenueItemsSchema = z.array(
  publicBudgetRevenueItemSchema
);

export const publicBudgetRevenueAllocationSchema = z.strictObject({
  allocationLinkId: nonEmptyStringSchema,
  revenueDetailId: nonEmptyStringSchema,
  targetBudgetProgramGroupId: nonEmptyStringSchema.nullable(),
  targetBudgetProgramIdentityId: nonEmptyStringSchema,
  targetBudgetItemKey: nonEmptyStringSchema,
  targetAccountCode: budgetAccountCodeSchema,
  targetProgramName: nonEmptyStringSchema,
  targetBudgetBookPage: positiveIntegerSchema,
  targetResolutionLevel: z.enum(["exact_group", "public_identity"]),
  candidateTargetGroupCount: positiveIntegerSchema,
  relationType: z.literal("allocated_to_program"),
  allocationAmountThousandYen: z.null(),
  amountAttributionStatus: z.literal("not_available"),
  sourceReference: officialPdfSourceReferenceSchema,
});

export const publicBudgetRevenueAllocationsSchema = z.array(
  publicBudgetRevenueAllocationSchema
);

export const publicDatasetFileRoleSchema = z.enum([
  "public_expenditure_program_identity_master",
  "public_expenditure_program_detail_records",
  "public_expenditure_budget_item_read_model",
  "public_revenue_detail_records",
  "public_revenue_budget_item_read_model",
  "public_revenue_expenditure_relation_read_model",
]);

const publicCsvFileManifestSchema = z.strictObject({
  path: nonEmptyStringSchema,
  format: z.literal("csv"),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rowCount: nonNegativeIntegerSchema,
  columnCount: positiveIntegerSchema,
  role: publicDatasetFileRoleSchema,
  requiredForProduction: z.literal(true),
});

const publicJsonFileManifestSchema = z.strictObject({
  path: nonEmptyStringSchema,
  format: z.literal("json"),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  itemCount: nonNegativeIntegerSchema,
  role: publicDatasetFileRoleSchema,
  requiredForProduction: z.literal(true),
});

export const publicDatasetFileManifestSchema = z.discriminatedUnion("format", [
  publicCsvFileManifestSchema,
  publicJsonFileManifestSchema,
]);

export const publicDatasetManifestSchema = z.strictObject({
  schemaVersion: z.string(),
  fiscalYear: integerSchema,
  datasetKind: z.string(),
  budgetType: z.string(),
  currencyUnit: z.string(),
  generatedCommand: nonEmptyStringSchema,
  publicFiles: z.array(publicDatasetFileManifestSchema),
  totals: z.strictObject({
    expenditureTotalAmountThousandYen: integerSchema,
    revenueTotalAmountThousandYen: integerSchema,
  }),
  accountTotals: z.array(
    z.strictObject({
      account_code: budgetAccountCodeSchema,
      account_name: nonEmptyStringSchema,
      expenditure_amount_thousand_yen: integerSchema,
      revenue_amount_thousand_yen: integerSchema,
    })
  ),
  counts: z.strictObject({
    publicBudgetProgramIdentityCount: nonNegativeIntegerSchema,
    publicBudgetProgramCount: nonNegativeIntegerSchema,
    publicBudgetItemCount: nonNegativeIntegerSchema,
    publicBudgetRevenueDetailCount: nonNegativeIntegerSchema,
    publicBudgetRevenueItemCount: nonNegativeIntegerSchema,
    publicBudgetRevenueAllocationCount: nonNegativeIntegerSchema,
    exactGroupAllocationCount: nonNegativeIntegerSchema,
    publicIdentityAllocationCount: nonNegativeIntegerSchema,
    allocationAmountNonNullCount: nonNegativeIntegerSchema,
    zeroAmountRevenueDetailCount: nonNegativeIntegerSchema,
    zeroAmountRevenueItemCount: nonNegativeIntegerSchema,
    zeroAmountProgramIdentityCount: nonNegativeIntegerSchema,
  }),
  validation: z.strictObject({
    status: z.string(),
    errors: z.array(z.unknown()),
  }),
});

export type PublicBudgetProgramIdentityRow = z.infer<
  typeof publicBudgetProgramIdentityRowSchema
>;
export type PublicBudgetProgramRow = z.infer<
  typeof publicBudgetProgramRowSchema
>;
export type PublicBudgetRevenueDetailRow = z.infer<
  typeof publicBudgetRevenueDetailRowSchema
>;
export type PublicBudgetItem = z.infer<typeof publicBudgetItemSchema>;
export type PublicBudgetRevenueItem = z.infer<
  typeof publicBudgetRevenueItemSchema
>;
export type PublicBudgetRevenueAllocation = z.infer<
  typeof publicBudgetRevenueAllocationSchema
>;
export type PublicDatasetFileManifest = z.infer<
  typeof publicDatasetFileManifestSchema
>;
export type PublicDatasetManifest = z.infer<typeof publicDatasetManifestSchema>;
