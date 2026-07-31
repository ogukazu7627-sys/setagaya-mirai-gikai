import { z } from "zod";
import { BUDGET_ACCOUNT_CODES } from "../../shared/constants/budget";

const safeIntegerSchema = z
  .number()
  .int()
  .refine(Number.isSafeInteger, "金額または件数が安全整数ではありません");
const accountCodeSchema = z.enum(BUDGET_ACCOUNT_CODES);
const validationStatusSchema = z.enum(["ok", "ok_zero_amount"]);
const sourceReferenceSchema = z.json();

const activeDatasetRpcSchema = z
  .object({
    id: z.uuid(),
    fiscal_year: z.number().int().min(2000).max(2200),
    budget_type: z.string(),
    schema_version: z.string(),
    currency_unit: z.string(),
    manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    validation_status: z.string().optional(),
    activated_at: z.string().nullable().optional(),
  })
  .transform((value) => ({
    id: value.id,
    fiscalYear: value.fiscal_year,
    budgetType: value.budget_type,
    schemaVersion: value.schema_version,
    currencyUnit: value.currency_unit,
    manifestSha256: value.manifest_sha256,
    validationStatus: value.validation_status,
    activatedAt: value.activated_at,
  }));

export const budgetOverviewRpcSchema = z
  .object({
    active_dataset: activeDatasetRpcSchema.nullable(),
    fiscal_year: z.number().int().min(2000).max(2200).nullable(),
    accounts: z.array(
      z.object({
        account_code: accountCodeSchema,
        account_name: z.string(),
        expenditure_amount_thousand_yen: safeIntegerSchema,
        revenue_amount_thousand_yen: safeIntegerSchema,
        identity_count: safeIntegerSchema.nonnegative(),
      })
    ),
    expenditure_total_amount_thousand_yen: safeIntegerSchema,
    revenue_total_amount_thousand_yen: safeIntegerSchema,
    identity_count: safeIntegerSchema.nonnegative(),
  })
  .transform((value) => ({
    activeDataset: value.active_dataset,
    fiscalYear: value.fiscal_year,
    accounts: value.accounts.map((account) => ({
      accountCode: account.account_code,
      accountName: account.account_name,
      expenditureAmountThousandYen: account.expenditure_amount_thousand_yen,
      revenueAmountThousandYen: account.revenue_amount_thousand_yen,
      identityCount: account.identity_count,
    })),
    expenditureTotalAmountThousandYen:
      value.expenditure_total_amount_thousand_yen,
    revenueTotalAmountThousandYen: value.revenue_total_amount_thousand_yen,
    identityCount: value.identity_count,
  }));

export const budgetProgramSearchRowSchema = z
  .object({
    dataset_id: z.uuid(),
    budget_program_identity_id: z.string().min(1),
    fiscal_year: z.number().int().min(2000).max(2200),
    account_code: accountCodeSchema,
    account_name: z.string(),
    budget_item_key: z.string().min(1),
    kan_code: z.string(),
    kan_name: z.string(),
    kou_code: z.string(),
    kou_name: z.string(),
    moku_code: z.string(),
    moku_name: z.string(),
    display_program_name: z.string(),
    department_display_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    member_group_count: safeIntegerSchema.nonnegative(),
    member_program_count: safeIntegerSchema.nonnegative(),
    related_revenue_count: safeIntegerSchema.nonnegative(),
    has_public_identity_resolution: z.boolean(),
    is_zero_amount: z.boolean(),
    published_topics: z.array(
      z.strictObject({
        slug: z.string().min(1),
        name: z.string().min(1),
      })
    ),
    score: z.number().finite(),
    matched_field: z.string(),
    total_count: safeIntegerSchema.nonnegative(),
  })
  .transform((value) => ({
    item: {
      datasetId: value.dataset_id,
      budgetProgramIdentityId: value.budget_program_identity_id,
      fiscalYear: value.fiscal_year,
      accountCode: value.account_code,
      accountName: value.account_name,
      budgetItemKey: value.budget_item_key,
      kan: { code: value.kan_code, name: value.kan_name },
      kou: { code: value.kou_code, name: value.kou_name },
      moku: { code: value.moku_code, name: value.moku_name },
      displayProgramName: value.display_program_name,
      departmentDisplayName: value.department_display_name,
      amountThousandYen: value.amount_thousand_yen,
      memberGroupCount: value.member_group_count,
      memberProgramCount: value.member_program_count,
      relatedRevenueCount: value.related_revenue_count,
      hasPublicIdentityResolution: value.has_public_identity_resolution,
      isZeroAmount: value.is_zero_amount,
      publishedTopics: value.published_topics,
      score: value.score,
      matchedField: value.matched_field,
    },
    totalCount: value.total_count,
  }));

const budgetProgramIdentityRpcSchema = z
  .object({
    budget_program_identity_id: z.string(),
    fiscal_year: z.number().int(),
    account_code: accountCodeSchema,
    account_name: z.string(),
    budget_side: z.literal("expenditure"),
    budget_item_key: z.string(),
    kan_code: z.string(),
    kan_name: z.string(),
    kou_code: z.string(),
    kou_name: z.string(),
    moku_code: z.string(),
    moku_name: z.string(),
    display_program_name: z.string(),
    department_display_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    member_group_count: safeIntegerSchema.nonnegative(),
    member_program_count: safeIntegerSchema.nonnegative(),
    related_revenue_count: safeIntegerSchema.nonnegative(),
    has_public_identity_resolution: z.boolean(),
    is_zero_amount: z.boolean(),
    source_type: z.string(),
  })
  .transform((value) => ({
    budgetProgramIdentityId: value.budget_program_identity_id,
    fiscalYear: value.fiscal_year,
    accountCode: value.account_code,
    accountName: value.account_name,
    budgetSide: value.budget_side,
    budgetItemKey: value.budget_item_key,
    kan: { code: value.kan_code, name: value.kan_name },
    kou: { code: value.kou_code, name: value.kou_name },
    moku: { code: value.moku_code, name: value.moku_name },
    displayProgramName: value.display_program_name,
    departmentDisplayName: value.department_display_name,
    amountThousandYen: value.amount_thousand_yen,
    memberGroupCount: value.member_group_count,
    memberProgramCount: value.member_program_count,
    relatedRevenueCount: value.related_revenue_count,
    hasPublicIdentityResolution: value.has_public_identity_resolution,
    isZeroAmount: value.is_zero_amount,
    sourceType: value.source_type,
  }));

const budgetProgramMemberRpcSchema = z
  .object({
    program_id: z.string(),
    major_program_name: z.string(),
    budget_program_name: z.string(),
    detail_program_name: z.string(),
    department_display_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    is_zero_amount: z.boolean(),
    source_reference: sourceReferenceSchema,
  })
  .transform((value) => ({
    programId: value.program_id,
    majorProgramName: value.major_program_name,
    budgetProgramName: value.budget_program_name,
    detailProgramName: value.detail_program_name,
    departmentDisplayName: value.department_display_name,
    amountThousandYen: value.amount_thousand_yen,
    isZeroAmount: value.is_zero_amount,
    sourceReference: value.source_reference,
  }));

const budgetItemRpcSchema = z
  .object({
    budget_item_key: z.string(),
    fiscal_year: z.number().int(),
    account_code: accountCodeSchema,
    account_name: z.string(),
    budget_side: z.literal("expenditure"),
    kan_code: z.string(),
    kan_name: z.string(),
    kou_code: z.string(),
    kou_name: z.string(),
    moku_code: z.string(),
    moku_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    validation_status: validationStatusSchema,
    is_zero_amount: z.boolean(),
    data_availability: sourceReferenceSchema,
    source_references: z.array(sourceReferenceSchema),
  })
  .transform((value) => ({
    budgetItemKey: value.budget_item_key,
    fiscalYear: value.fiscal_year,
    accountCode: value.account_code,
    accountName: value.account_name,
    budgetSide: value.budget_side,
    kan: { code: value.kan_code, name: value.kan_name },
    kou: { code: value.kou_code, name: value.kou_name },
    moku: { code: value.moku_code, name: value.moku_name },
    amountThousandYen: value.amount_thousand_yen,
    validationStatus: value.validation_status,
    isZeroAmount: value.is_zero_amount,
    dataAvailability: value.data_availability,
    sourceReferences: value.source_references,
  }));

const budgetOtherProgramRpcSchema = z
  .object({
    budget_program_identity_id: z.string(),
    display_program_name: z.string(),
    department_display_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    is_zero_amount: z.boolean(),
  })
  .transform((value) => ({
    budgetProgramIdentityId: value.budget_program_identity_id,
    displayProgramName: value.display_program_name,
    departmentDisplayName: value.department_display_name,
    amountThousandYen: value.amount_thousand_yen,
    isZeroAmount: value.is_zero_amount,
  }));

const budgetItemSectionRpcSchema = z
  .object({
    section_id: z.string(),
    setsu_code: z.string(),
    setsu_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    scope: z.literal("budget_item"),
    source_reference: sourceReferenceSchema,
  })
  .transform((value) => ({
    sectionId: value.section_id,
    setsuCode: value.setsu_code,
    setsuName: value.setsu_name,
    amountThousandYen: value.amount_thousand_yen,
    scope: value.scope,
    sourceReference: value.source_reference,
  }));

const relatedRevenueDetailRpcSchema = z
  .object({
    allocation_link_id: z.string(),
    target_resolution_level: z.enum(["exact_group", "public_identity"]),
    relation_type: z.literal("allocated_to_program"),
    amount_attribution_status: z.literal("not_available"),
    revenue_detail_id: z.string(),
    revenue_item_key: z.string(),
    account_code: accountCodeSchema,
    account_name: z.string(),
    kan_code: z.string(),
    kan_name: z.string(),
    kou_code: z.string(),
    kou_name: z.string(),
    moku_code: z.string(),
    moku_name: z.string(),
    setsu_code: z.string(),
    setsu_name: z.string(),
    saisetsu_code: z.string(),
    saisetsu_name: z.string(),
    department_display_name: z.string(),
    source_funding_category_name: z.string(),
    funding_nature: z.enum(["general", "specific", "special_account"]),
    current_amount_thousand_yen: safeIntegerSchema,
    source_reference: sourceReferenceSchema,
    allocation_source_reference: sourceReferenceSchema,
  })
  .transform((value) => ({
    allocationLinkId: value.allocation_link_id,
    targetResolutionLevel: value.target_resolution_level,
    relationType: value.relation_type,
    amountAttributionStatus: value.amount_attribution_status,
    revenueDetailId: value.revenue_detail_id,
    revenueItemKey: value.revenue_item_key,
    accountCode: value.account_code,
    accountName: value.account_name,
    kan: { code: value.kan_code, name: value.kan_name },
    kou: { code: value.kou_code, name: value.kou_name },
    moku: { code: value.moku_code, name: value.moku_name },
    setsu: { code: value.setsu_code, name: value.setsu_name },
    saisetsu: {
      code: value.saisetsu_code,
      name: value.saisetsu_name,
    },
    departmentDisplayName: value.department_display_name,
    sourceFundingCategoryName: value.source_funding_category_name,
    fundingNature: value.funding_nature,
    currentAmountThousandYen: value.current_amount_thousand_yen,
    sourceReference: value.source_reference,
    allocationSourceReference: value.allocation_source_reference,
  }));

const budgetProgramTopicRelationRpcSchema = z
  .object({
    id: z.uuid(),
    slug: z.string().min(1),
    name: z.string().min(1),
    short_description: z.string(),
    topic_kind: z.enum(["problem", "goal", "administrative_function"]),
    relation_type: z.enum(["responds_to", "supports", "maintains", "enables"]),
    explanation: z.string().min(1),
    evidence_level: z.enum([
      "A_official_direct",
      "B_strong_structural",
      "C_editorial",
    ]),
    evidence_fields: sourceReferenceSchema,
    evidence_source_url: z.url().nullable(),
    categories: z.array(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        is_primary: z.boolean(),
      })
    ),
  })
  .transform((value) => ({
    id: value.id,
    slug: value.slug,
    name: value.name,
    shortDescription: value.short_description,
    topicKind: value.topic_kind,
    relationType: value.relation_type,
    explanation: value.explanation,
    evidenceLevel: value.evidence_level,
    evidenceFields: value.evidence_fields,
    evidenceSourceUrl: value.evidence_source_url,
    categories: value.categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      isPrimary: category.is_primary,
    })),
  }));

export const budgetProgramDetailRpcSchema = z
  .object({
    active_dataset: activeDatasetRpcSchema,
    identity: budgetProgramIdentityRpcSchema,
    member_programs: z.array(budgetProgramMemberRpcSchema),
    budget_item: budgetItemRpcSchema,
    other_programs: z.array(budgetOtherProgramRpcSchema),
    sections: z.array(budgetItemSectionRpcSchema),
    related_revenue_details: z.array(relatedRevenueDetailRpcSchema),
    published_topics: z.array(budgetProgramTopicRelationRpcSchema),
    source_references: z.array(sourceReferenceSchema),
  })
  .transform((value) => ({
    activeDataset: value.active_dataset,
    identity: value.identity,
    memberPrograms: value.member_programs,
    budgetItem: value.budget_item,
    otherPrograms: value.other_programs,
    sections: value.sections,
    relatedRevenueDetails: value.related_revenue_details,
    publishedTopics: value.published_topics,
    sourceReferences: value.source_references,
  }));

const hierarchyProgramRpcSchema = z
  .object({
    budget_program_identity_id: z.string(),
    display_program_name: z.string(),
    department_display_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    is_zero_amount: z.boolean(),
  })
  .transform((value) => ({
    budgetProgramIdentityId: value.budget_program_identity_id,
    displayProgramName: value.display_program_name,
    departmentDisplayName: value.department_display_name,
    amountThousandYen: value.amount_thousand_yen,
    isZeroAmount: value.is_zero_amount,
  }));

const hierarchyMokuRpcSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    budget_item_key: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    validation_status: validationStatusSchema,
    is_zero_amount: z.boolean(),
    programs: z.array(hierarchyProgramRpcSchema),
  })
  .transform((value) => ({
    code: value.code,
    name: value.name,
    budgetItemKey: value.budget_item_key,
    amountThousandYen: value.amount_thousand_yen,
    validationStatus: value.validation_status,
    isZeroAmount: value.is_zero_amount,
    programs: value.programs,
  }));

const hierarchyKouRpcSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    mokus: z.array(hierarchyMokuRpcSchema),
  })
  .transform((value) => ({
    code: value.code,
    name: value.name,
    amountThousandYen: value.amount_thousand_yen,
    mokus: value.mokus,
  }));

const hierarchyKanRpcSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    kous: z.array(hierarchyKouRpcSchema),
  })
  .transform((value) => ({
    code: value.code,
    name: value.name,
    amountThousandYen: value.amount_thousand_yen,
    kous: value.kous,
  }));

const hierarchyAccountRpcSchema = z
  .object({
    account_code: accountCodeSchema,
    account_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    kans: z.array(hierarchyKanRpcSchema),
  })
  .transform((value) => ({
    accountCode: value.account_code,
    accountName: value.account_name,
    amountThousandYen: value.amount_thousand_yen,
    kans: value.kans,
  }));

export const budgetOfficialHierarchyRpcSchema = z
  .object({
    active_dataset: activeDatasetRpcSchema.nullable(),
    accounts: z.array(hierarchyAccountRpcSchema),
  })
  .transform((value) => ({
    activeDataset: value.active_dataset,
    accounts: value.accounts,
  }));

const budgetRevenueItemRpcSchema = z
  .object({
    revenue_item_key: z.string(),
    fiscal_year: z.number().int(),
    account_code: accountCodeSchema,
    account_name: z.string(),
    budget_side: z.literal("revenue"),
    kan_code: z.string(),
    kan_name: z.string(),
    kou_code: z.string(),
    kou_name: z.string(),
    moku_code: z.string(),
    moku_name: z.string(),
    previous_amount_thousand_yen: safeIntegerSchema,
    current_amount_thousand_yen: safeIntegerSchema,
    diff_amount_thousand_yen: safeIntegerSchema,
    general_revenue_thousand_yen: safeIntegerSchema,
    specific_revenue_thousand_yen: safeIntegerSchema,
    special_account_revenue_thousand_yen: safeIntegerSchema,
    validation_status: validationStatusSchema,
    is_zero_amount: z.boolean(),
    revenue_source_display: sourceReferenceSchema,
    data_availability: sourceReferenceSchema,
    source_references: z.array(sourceReferenceSchema),
  })
  .transform((value) => ({
    revenueItemKey: value.revenue_item_key,
    fiscalYear: value.fiscal_year,
    accountCode: value.account_code,
    accountName: value.account_name,
    budgetSide: value.budget_side,
    kan: { code: value.kan_code, name: value.kan_name },
    kou: { code: value.kou_code, name: value.kou_name },
    moku: { code: value.moku_code, name: value.moku_name },
    previousAmountThousandYen: value.previous_amount_thousand_yen,
    currentAmountThousandYen: value.current_amount_thousand_yen,
    diffAmountThousandYen: value.diff_amount_thousand_yen,
    generalRevenueThousandYen: value.general_revenue_thousand_yen,
    specificRevenueThousandYen: value.specific_revenue_thousand_yen,
    specialAccountRevenueThousandYen:
      value.special_account_revenue_thousand_yen,
    validationStatus: value.validation_status,
    isZeroAmount: value.is_zero_amount,
    revenueSourceDisplay: value.revenue_source_display,
    dataAvailability: value.data_availability,
    sourceReferences: value.source_references,
  }));

const budgetRevenueSectionRpcSchema = z
  .object({
    revenue_section_id: z.string(),
    setsu_code: z.string(),
    setsu_name: z.string(),
    previous_amount_thousand_yen: safeIntegerSchema,
    current_amount_thousand_yen: safeIntegerSchema,
    diff_amount_thousand_yen: safeIntegerSchema,
    detail_count: safeIntegerSchema.nonnegative(),
    validation_status: validationStatusSchema,
    source_reference: sourceReferenceSchema,
  })
  .transform((value) => ({
    revenueSectionId: value.revenue_section_id,
    setsu: { code: value.setsu_code, name: value.setsu_name },
    previousAmountThousandYen: value.previous_amount_thousand_yen,
    currentAmountThousandYen: value.current_amount_thousand_yen,
    diffAmountThousandYen: value.diff_amount_thousand_yen,
    detailCount: value.detail_count,
    validationStatus: value.validation_status,
    sourceReference: value.source_reference,
  }));

const budgetRevenueDetailRpcSchema = z
  .object({
    revenue_detail_id: z.string(),
    revenue_section_id: z.string(),
    setsu_code: z.string(),
    setsu_name: z.string(),
    saisetsu_code: z.string(),
    saisetsu_name: z.string(),
    department_display_name: z.string(),
    source_funding_category_name: z.string(),
    funding_nature: z.enum(["general", "specific", "special_account"]),
    previous_amount_thousand_yen: safeIntegerSchema,
    current_amount_thousand_yen: safeIntegerSchema,
    diff_amount_thousand_yen: safeIntegerSchema,
    is_zero_amount: z.boolean(),
    related_program_count: safeIntegerSchema.nonnegative(),
    source_reference: sourceReferenceSchema,
  })
  .transform((value) => ({
    revenueDetailId: value.revenue_detail_id,
    revenueSectionId: value.revenue_section_id,
    setsu: { code: value.setsu_code, name: value.setsu_name },
    saisetsu: {
      code: value.saisetsu_code,
      name: value.saisetsu_name,
    },
    departmentDisplayName: value.department_display_name,
    sourceFundingCategoryName: value.source_funding_category_name,
    fundingNature: value.funding_nature,
    previousAmountThousandYen: value.previous_amount_thousand_yen,
    currentAmountThousandYen: value.current_amount_thousand_yen,
    diffAmountThousandYen: value.diff_amount_thousand_yen,
    isZeroAmount: value.is_zero_amount,
    relatedProgramCount: value.related_program_count,
    sourceReference: value.source_reference,
  }));

const relatedExpenditureProgramRpcSchema = z
  .object({
    budget_program_identity_id: z.string(),
    budget_item_key: z.string(),
    account_code: accountCodeSchema,
    account_name: z.string(),
    display_program_name: z.string(),
    department_display_name: z.string(),
    amount_thousand_yen: safeIntegerSchema,
    relation_count: safeIntegerSchema.nonnegative(),
    revenue_detail_ids: z.array(z.string()),
    target_resolution_levels: z.array(
      z.enum(["exact_group", "public_identity"])
    ),
    source_references: z.array(sourceReferenceSchema),
  })
  .transform((value) => ({
    budgetProgramIdentityId: value.budget_program_identity_id,
    budgetItemKey: value.budget_item_key,
    accountCode: value.account_code,
    accountName: value.account_name,
    displayProgramName: value.display_program_name,
    departmentDisplayName: value.department_display_name,
    amountThousandYen: value.amount_thousand_yen,
    relationCount: value.relation_count,
    revenueDetailIds: value.revenue_detail_ids,
    targetResolutionLevels: value.target_resolution_levels,
    sourceReferences: value.source_references,
  }));

export const budgetRevenueItemDetailRpcSchema = z
  .object({
    active_dataset: activeDatasetRpcSchema,
    item: budgetRevenueItemRpcSchema,
    sections: z.array(budgetRevenueSectionRpcSchema),
    details: z.array(budgetRevenueDetailRpcSchema),
    related_expenditure_programs: z.array(relatedExpenditureProgramRpcSchema),
    source_references: z.array(sourceReferenceSchema),
  })
  .transform((value) => ({
    activeDataset: value.active_dataset,
    item: value.item,
    sections: value.sections,
    details: value.details,
    relatedExpenditurePrograms: value.related_expenditure_programs,
    sourceReferences: value.source_references,
  }));
