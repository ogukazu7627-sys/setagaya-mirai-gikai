import type { Json } from "@mirai-gikai/supabase";
import type { BUDGET_ACCOUNT_CODES } from "../constants/budget";

export type BudgetAccountCode = (typeof BUDGET_ACCOUNT_CODES)[number];

export interface ActiveBudgetDataset {
  id: string;
  fiscalYear: number;
  budgetType: string;
  schemaVersion: string;
  currencyUnit: string;
  manifestSha256: string;
  validationStatus?: string;
  activatedAt?: string | null;
}

export interface BudgetOverviewAccount {
  accountCode: BudgetAccountCode;
  accountName: string;
  expenditureAmountThousandYen: number;
  revenueAmountThousandYen: number;
  identityCount: number;
}

export interface BudgetOverview {
  activeDataset: ActiveBudgetDataset | null;
  fiscalYear: number | null;
  accounts: BudgetOverviewAccount[];
  expenditureTotalAmountThousandYen: number;
  revenueTotalAmountThousandYen: number;
  identityCount: number;
}

export interface BudgetProgramSearchOptions {
  fiscalYear?: number | null;
  accountCode?: BudgetAccountCode | null;
  includeZeroAmount?: boolean;
  page?: number;
  pageSize?: number;
}

export interface BudgetProgramSearchInput extends BudgetProgramSearchOptions {
  query: string;
}

export interface BudgetProgramSearchItem {
  datasetId: string;
  budgetProgramIdentityId: string;
  fiscalYear: number;
  accountCode: BudgetAccountCode;
  accountName: string;
  budgetItemKey: string;
  kan: BudgetHierarchyLabel;
  kou: BudgetHierarchyLabel;
  moku: BudgetHierarchyLabel;
  displayProgramName: string;
  departmentDisplayName: string;
  amountThousandYen: number;
  memberGroupCount: number;
  memberProgramCount: number;
  relatedRevenueCount: number;
  hasPublicIdentityResolution: boolean;
  isZeroAmount: boolean;
  score: number;
  matchedField: string;
}

export interface BudgetProgramSearchResult {
  items: BudgetProgramSearchItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BudgetHierarchyLabel {
  code: string;
  name: string;
}

export interface BudgetProgramIdentity {
  budgetProgramIdentityId: string;
  fiscalYear: number;
  accountCode: BudgetAccountCode;
  accountName: string;
  budgetSide: "expenditure";
  budgetItemKey: string;
  kan: BudgetHierarchyLabel;
  kou: BudgetHierarchyLabel;
  moku: BudgetHierarchyLabel;
  displayProgramName: string;
  departmentDisplayName: string;
  amountThousandYen: number;
  memberGroupCount: number;
  memberProgramCount: number;
  relatedRevenueCount: number;
  hasPublicIdentityResolution: boolean;
  isZeroAmount: boolean;
  sourceType: string;
}

export interface BudgetProgramMember {
  programId: string;
  majorProgramName: string;
  budgetProgramName: string;
  detailProgramName: string;
  departmentDisplayName: string;
  amountThousandYen: number;
  isZeroAmount: boolean;
  sourceReference: Json;
}

export interface BudgetItem {
  budgetItemKey: string;
  fiscalYear: number;
  accountCode: BudgetAccountCode;
  accountName: string;
  budgetSide: "expenditure";
  kan: BudgetHierarchyLabel;
  kou: BudgetHierarchyLabel;
  moku: BudgetHierarchyLabel;
  amountThousandYen: number;
  validationStatus: "ok" | "ok_zero_amount";
  isZeroAmount: boolean;
  dataAvailability: Json;
  sourceReferences: Json[];
}

export interface BudgetOtherProgram {
  budgetProgramIdentityId: string;
  displayProgramName: string;
  departmentDisplayName: string;
  amountThousandYen: number;
  isZeroAmount: boolean;
}

export interface BudgetItemSection {
  sectionId: string;
  setsuCode: string;
  setsuName: string;
  amountThousandYen: number;
  scope: "budget_item";
  sourceReference: Json;
}

export interface BudgetRelatedRevenueDetail {
  allocationLinkId: string;
  targetResolutionLevel: "exact_group" | "public_identity";
  relationType: "allocated_to_program";
  amountAttributionStatus: "not_available";
  revenueDetailId: string;
  revenueItemKey: string;
  accountCode: BudgetAccountCode;
  accountName: string;
  kan: BudgetHierarchyLabel;
  kou: BudgetHierarchyLabel;
  moku: BudgetHierarchyLabel;
  setsu: BudgetHierarchyLabel;
  saisetsu: BudgetHierarchyLabel;
  departmentDisplayName: string;
  sourceFundingCategoryName: string;
  fundingNature: "general" | "specific" | "special_account";
  currentAmountThousandYen: number;
  sourceReference: Json;
  allocationSourceReference: Json;
}

export interface BudgetProgramDetail {
  activeDataset: ActiveBudgetDataset;
  identity: BudgetProgramIdentity;
  memberPrograms: BudgetProgramMember[];
  budgetItem: BudgetItem;
  otherPrograms: BudgetOtherProgram[];
  sections: BudgetItemSection[];
  relatedRevenueDetails: BudgetRelatedRevenueDetail[];
  sourceReferences: Json[];
}

export interface BudgetOfficialHierarchyProgram {
  budgetProgramIdentityId: string;
  displayProgramName: string;
  departmentDisplayName: string;
  amountThousandYen: number;
  isZeroAmount: boolean;
}

export interface BudgetOfficialHierarchyMoku extends BudgetHierarchyLabel {
  budgetItemKey: string;
  amountThousandYen: number;
  validationStatus: "ok" | "ok_zero_amount";
  isZeroAmount: boolean;
  programs: BudgetOfficialHierarchyProgram[];
}

export interface BudgetOfficialHierarchyKou extends BudgetHierarchyLabel {
  amountThousandYen: number;
  mokus: BudgetOfficialHierarchyMoku[];
}

export interface BudgetOfficialHierarchyKan extends BudgetHierarchyLabel {
  amountThousandYen: number;
  kous: BudgetOfficialHierarchyKou[];
}

export interface BudgetOfficialHierarchyAccount {
  accountCode: BudgetAccountCode;
  accountName: string;
  amountThousandYen: number;
  kans: BudgetOfficialHierarchyKan[];
}

export interface BudgetOfficialHierarchy {
  activeDataset: ActiveBudgetDataset | null;
  accounts: BudgetOfficialHierarchyAccount[];
}

export interface BudgetRevenueSection {
  revenueSectionId: string;
  setsu: BudgetHierarchyLabel;
  previousAmountThousandYen: number;
  currentAmountThousandYen: number;
  diffAmountThousandYen: number;
  detailCount: number;
  validationStatus: "ok" | "ok_zero_amount";
  sourceReference: Json;
}

export interface BudgetRevenueDetail {
  revenueDetailId: string;
  revenueSectionId: string;
  setsu: BudgetHierarchyLabel;
  saisetsu: BudgetHierarchyLabel;
  departmentDisplayName: string;
  sourceFundingCategoryName: string;
  fundingNature: "general" | "specific" | "special_account";
  previousAmountThousandYen: number;
  currentAmountThousandYen: number;
  diffAmountThousandYen: number;
  isZeroAmount: boolean;
  relatedProgramCount: number;
  sourceReference: Json;
}

export interface BudgetRelatedExpenditureProgram {
  budgetProgramIdentityId: string;
  budgetItemKey: string;
  accountCode: BudgetAccountCode;
  accountName: string;
  displayProgramName: string;
  departmentDisplayName: string;
  amountThousandYen: number;
  relationCount: number;
  revenueDetailIds: string[];
  targetResolutionLevels: Array<"exact_group" | "public_identity">;
  sourceReferences: Json[];
}

export interface BudgetRevenueItem {
  revenueItemKey: string;
  fiscalYear: number;
  accountCode: BudgetAccountCode;
  accountName: string;
  budgetSide: "revenue";
  kan: BudgetHierarchyLabel;
  kou: BudgetHierarchyLabel;
  moku: BudgetHierarchyLabel;
  previousAmountThousandYen: number;
  currentAmountThousandYen: number;
  diffAmountThousandYen: number;
  generalRevenueThousandYen: number;
  specificRevenueThousandYen: number;
  specialAccountRevenueThousandYen: number;
  validationStatus: "ok" | "ok_zero_amount";
  isZeroAmount: boolean;
  revenueSourceDisplay: Json;
  dataAvailability: Json;
  sourceReferences: Json[];
}

export interface BudgetRevenueItemDetail {
  activeDataset: ActiveBudgetDataset;
  item: BudgetRevenueItem;
  sections: BudgetRevenueSection[];
  details: BudgetRevenueDetail[];
  relatedExpenditurePrograms: BudgetRelatedExpenditureProgram[];
  sourceReferences: Json[];
}
