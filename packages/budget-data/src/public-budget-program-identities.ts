import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { BUDGET_ITEM_COLUMNS } from "./budget-items";
import { BUDGET_PROGRAM_GROUP_COLUMNS } from "./budget-program-groups";
import {
  BUDGET_PROGRAM_IDENTITY_COLUMNS,
  BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
} from "./budget-program-identities";
import { BUDGET_PROGRAM_COLUMNS } from "./budget-programs";
import {
  type DepartmentNameMapping,
  parseDepartmentNameMap,
} from "./department-name-map";
import {
  EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
  EXPECTED_PUBLIC_BUDGET_PROGRAM_ROW_COUNT,
  EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
  PUBLIC_BUDGET_PROGRAM_COLUMNS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
} from "./public-budget";
import { EXPECTED_PUBLIC_BUDGET_REVENUE_ALLOCATION_ROW_COUNT } from "./public-budget-revenue";

export const EXPECTED_PUBLIC_BUDGET_PROGRAM_IDENTITY_ROW_COUNT = 1_156;
export const EXPECTED_PUBLIC_MULTIPLE_GROUP_IDENTITY_COUNT = 7;
export const EXPECTED_PUBLIC_IDENTITY_RESOLUTION_ALLOCATION_COUNT = 39;

export const PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS = [
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

export interface PublicBudgetProgramIdentity {
  budget_program_identity_id: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  budget_side: "expenditure";
  budget_item_key: string;
  kan_code: string;
  kan_name: string;
  kou_code: string;
  kou_name: string;
  moku_code: string;
  moku_name: string;
  display_program_name: string;
  department_display_name: string;
  amount_thousand_yen: number;
  member_group_count: number;
  member_program_count: number;
  related_revenue_count: number;
  has_public_identity_resolution: boolean;
  is_zero_amount: boolean;
  source_type: "derived_public";
}

export interface PublicBudgetProgramIdentityInput {
  identitiesCsv: string;
  identityMembersCsv: string;
  programGroupsCsv: string;
  programsCsv: string;
  itemsCsv: string;
  publicProgramsCsv: string;
  publicRevenueAllocationsJson: string;
  departmentMapCsv: string;
}

export interface PublicBudgetProgramIdentityValidation {
  identityRowCount: number;
  uniqueIdentityIdCount: number;
  groupRowCount: number;
  uniqueMemberGroupIdCount: number;
  programRowCount: number;
  publicProgramRowCount: number;
  allocationRowCount: number;
  multipleGroupIdentityCount: number;
  relatedRevenueIdentityCount: number;
  publicIdentityResolutionIdentityCount: number;
  publicIdentityResolutionAllocationCount: number;
  zeroAmountIdentityCount: number;
  blankDepartmentDisplayNameCount: number;
  totalAmountThousandYen: number;
  accountTotalsThousandYen: Record<string, number>;
  isPass: boolean;
}

export interface PublicBudgetProgramIdentityBuildResult {
  identities: PublicBudgetProgramIdentity[];
  publicProgramsCsv: string;
  validation: PublicBudgetProgramIdentityValidation;
}

export interface PublicBudgetProgramIdentityBuildOptions {
  enforceProductionExpectations?: boolean;
}

type CsvRow = Record<string, string>;

interface ParsedCsvTable {
  columns: string[];
  rows: CsvRow[];
}

interface CoreIdentity {
  id: string;
  fiscalYear: number;
  accountCode: string;
  accountName: string;
  budgetItemKey: string;
  displayProgramName: string;
  departmentName: string;
  totalAmountThousandYen: number;
  memberGroupCount: number;
}

interface IdentityMember {
  identityId: string;
  groupId: string;
  budgetItemKey: string;
  majorProgramName: string;
  budgetProgramName: string;
  departmentName: string;
  amountThousandYen: number;
}

interface CoreProgramGroup {
  id: string;
  budgetItemKey: string;
  fiscalYear: number;
  accountCode: string;
  accountName: string;
  majorProgramName: string;
  budgetProgramName: string;
  departmentName: string;
  totalAmountThousandYen: number;
  memberProgramCount: number;
}

interface CoreProgram {
  id: string;
  groupId: string;
  budgetItemKey: string;
  accountCode: string;
  amountThousandYen: number;
}

interface CoreBudgetItem {
  budgetItemKey: string;
  fiscalYear: number;
  accountCode: string;
  accountName: string;
  budgetSide: "expenditure";
  kanCode: string;
  kanName: string;
  kouCode: string;
  kouName: string;
  mokuCode: string;
  mokuName: string;
}

interface PublicRevenueAllocationReference {
  allocationId: string;
  identityId: string;
  groupId: string | null;
  resolutionLevel: "exact_group" | "public_identity";
}

const REQUIRED_PUBLIC_ALLOCATION_FIELDS = [
  "allocationLinkId",
  "targetBudgetProgramIdentityId",
  "targetBudgetProgramGroupId",
  "targetResolutionLevel",
] as const;

function parseCsvTable(
  csvText: string,
  expectedColumns: readonly string[],
  sourceName: string,
): ParsedCsvTable {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length < 2) {
    throw new Error(`${sourceName}にデータ行がありません。`);
  }
  const columns = records[0];
  if (columns.join(",") !== expectedColumns.join(",")) {
    throw new Error(`${sourceName}の列が一致しません。`);
  }
  return {
    columns,
    rows: records.slice(1).map((record) =>
      Object.fromEntries(
        columns.map((column, index) => [column, record[index] ?? ""]),
      ),
    ),
  };
}

function parsePublicProgramsTable(csvText: string): ParsedCsvTable {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length < 2) {
    throw new Error("public_budget_programs.csvにデータ行がありません。");
  }
  const columns = records[0];
  const isBase =
    columns.join(",") === PUBLIC_BUDGET_PROGRAM_COLUMNS.join(",");
  const isExtended =
    columns.join(",") ===
    PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY.join(",");
  if (!isBase && !isExtended) {
    throw new Error("public_budget_programs.csvの列が一致しません。");
  }
  return {
    columns,
    rows: records.slice(1).map((record) =>
      Object.fromEntries(
        columns.map((column, index) => [column, record[index] ?? ""]),
      ),
    ),
  };
}

function requiredText(
  value: string | undefined,
  fieldName: string,
): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${fieldName}が空です。`);
  }
  return value;
}

function parseInteger(
  value: string | undefined,
  fieldName: string,
  options: { positive?: boolean; nonNegative?: boolean } = {},
): number {
  const text = value?.trim() ?? "";
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`${fieldName}が整数ではありません: ${text}`);
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${fieldName}が安全な整数範囲外です: ${text}`);
  }
  if (options.positive && parsed <= 0) {
    throw new Error(`${fieldName}が正の整数ではありません: ${text}`);
  }
  if (options.nonNegative && parsed < 0) {
    throw new Error(`${fieldName}が0以上ではありません: ${text}`);
  }
  return parsed;
}

function safeAdd(left: number, right: number, fieldName: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error(`${fieldName}が安全な整数範囲外です。`);
  }
  return result;
}

function indexUnique<T>(
  rows: readonly T[],
  getKey: (row: T) => string,
  fieldName: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const row of rows) {
    const key = getKey(row);
    if (result.has(key)) {
      throw new Error(`${fieldName}が重複しています: ${key}`);
    }
    result.set(key, row);
  }
  return result;
}

function groupBy<T>(
  rows: readonly T[],
  getKey: (row: T) => string,
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    const values = result.get(key) ?? [];
    values.push(row);
    result.set(key, values);
  }
  return result;
}

function parseCoreIdentities(csvText: string): CoreIdentity[] {
  const { rows } = parseCsvTable(
    csvText,
    BUDGET_PROGRAM_IDENTITY_COLUMNS,
    "budget_program_identities.csv",
  );
  return rows.map((row, index) => {
    const prefix = `budget_program_identities.csv ${index + 1}行目`;
    if (row.source_type !== "derived") {
      throw new Error(`${prefix}.source_typeがderivedではありません。`);
    }
    return {
      id: requiredText(row.budget_program_identity_id, `${prefix}.id`),
      fiscalYear: parseInteger(row.fiscal_year, `${prefix}.fiscal_year`, {
        positive: true,
      }),
      accountCode: requiredText(
        row.account_code,
        `${prefix}.account_code`,
      ),
      accountName: requiredText(
        row.account_name,
        `${prefix}.account_name`,
      ),
      budgetItemKey: requiredText(
        row.budget_item_key,
        `${prefix}.budget_item_key`,
      ),
      displayProgramName: row.display_program_name,
      departmentName: requiredText(
        row.department_name,
        `${prefix}.department_name`,
      ),
      totalAmountThousandYen: parseInteger(
        row.total_amount_thousand_yen,
        `${prefix}.total_amount_thousand_yen`,
      ),
      memberGroupCount: parseInteger(
        row.member_group_count,
        `${prefix}.member_group_count`,
        { positive: true },
      ),
    };
  });
}

function parseIdentityMembers(csvText: string): IdentityMember[] {
  const { rows } = parseCsvTable(
    csvText,
    BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
    "budget_program_identity_members.csv",
  );
  return rows.map((row, index) => {
    const prefix =
      `budget_program_identity_members.csv ${index + 1}行目`;
    if (row.source_type !== "derived") {
      throw new Error(`${prefix}.source_typeがderivedではありません。`);
    }
    return {
      identityId: requiredText(
        row.budget_program_identity_id,
        `${prefix}.budget_program_identity_id`,
      ),
      groupId: requiredText(
        row.budget_program_group_id,
        `${prefix}.budget_program_group_id`,
      ),
      budgetItemKey: requiredText(
        row.budget_item_key,
        `${prefix}.budget_item_key`,
      ),
      majorProgramName: requiredText(
        row.major_program_name,
        `${prefix}.major_program_name`,
      ),
      budgetProgramName: requiredText(
        row.budget_program_name,
        `${prefix}.budget_program_name`,
      ),
      departmentName: requiredText(
        row.department_name,
        `${prefix}.department_name`,
      ),
      amountThousandYen: parseInteger(
        row.amount_thousand_yen,
        `${prefix}.amount_thousand_yen`,
      ),
    };
  });
}

function parseCoreProgramGroups(csvText: string): CoreProgramGroup[] {
  const { rows } = parseCsvTable(
    csvText,
    BUDGET_PROGRAM_GROUP_COLUMNS,
    "budget_program_groups.csv",
  );
  return rows.map((row, index) => {
    const prefix = `budget_program_groups.csv ${index + 1}行目`;
    if (row.source_type !== "derived") {
      throw new Error(`${prefix}.source_typeがderivedではありません。`);
    }
    return {
      id: requiredText(
        row.budget_program_group_id,
        `${prefix}.budget_program_group_id`,
      ),
      budgetItemKey: requiredText(
        row.budget_item_key,
        `${prefix}.budget_item_key`,
      ),
      fiscalYear: parseInteger(row.fiscal_year, `${prefix}.fiscal_year`, {
        positive: true,
      }),
      accountCode: requiredText(
        row.account_code,
        `${prefix}.account_code`,
      ),
      accountName: requiredText(
        row.account_name,
        `${prefix}.account_name`,
      ),
      majorProgramName: requiredText(
        row.major_program_name,
        `${prefix}.major_program_name`,
      ),
      budgetProgramName: requiredText(
        row.budget_program_name,
        `${prefix}.budget_program_name`,
      ),
      departmentName: requiredText(
        row.department_name,
        `${prefix}.department_name`,
      ),
      totalAmountThousandYen: parseInteger(
        row.total_amount_thousand_yen,
        `${prefix}.total_amount_thousand_yen`,
      ),
      memberProgramCount: parseInteger(
        row.member_program_count,
        `${prefix}.member_program_count`,
        { positive: true },
      ),
    };
  });
}

function parseCorePrograms(csvText: string): CoreProgram[] {
  const { rows } = parseCsvTable(
    csvText,
    BUDGET_PROGRAM_COLUMNS,
    "budget_programs.csv",
  );
  return rows.map((row, index) => {
    const prefix = `budget_programs.csv ${index + 1}行目`;
    if (row.budget_side !== "expenditure") {
      throw new Error(`${prefix}.budget_sideがexpenditureではありません。`);
    }
    return {
      id: requiredText(row.program_id, `${prefix}.program_id`),
      groupId: requiredText(
        row.budget_program_group_id,
        `${prefix}.budget_program_group_id`,
      ),
      budgetItemKey: requiredText(
        row.budget_item_key,
        `${prefix}.budget_item_key`,
      ),
      accountCode: requiredText(
        row.account_code,
        `${prefix}.account_code`,
      ),
      amountThousandYen: parseInteger(
        row.amount_thousand_yen,
        `${prefix}.amount_thousand_yen`,
      ),
    };
  });
}

function parseCoreBudgetItems(csvText: string): CoreBudgetItem[] {
  const { rows } = parseCsvTable(
    csvText,
    BUDGET_ITEM_COLUMNS,
    "budget_items.csv",
  );
  return rows.map((row, index) => {
    const prefix = `budget_items.csv ${index + 1}行目`;
    if (row.budget_side !== "expenditure") {
      throw new Error(`${prefix}.budget_sideがexpenditureではありません。`);
    }
    return {
      budgetItemKey: requiredText(
        row.budget_item_key,
        `${prefix}.budget_item_key`,
      ),
      fiscalYear: parseInteger(row.fiscal_year, `${prefix}.fiscal_year`, {
        positive: true,
      }),
      accountCode: requiredText(
        row.account_code,
        `${prefix}.account_code`,
      ),
      accountName: requiredText(
        row.account_name,
        `${prefix}.account_name`,
      ),
      budgetSide: "expenditure",
      kanCode: requiredText(row.kan_code, `${prefix}.kan_code`),
      kanName: requiredText(row.kan_name, `${prefix}.kan_name`),
      kouCode: requiredText(row.kou_code, `${prefix}.kou_code`),
      kouName: requiredText(row.kou_name, `${prefix}.kou_name`),
      mokuCode: requiredText(row.moku_code, `${prefix}.moku_code`),
      mokuName: requiredText(row.moku_name, `${prefix}.moku_name`),
    };
  });
}

function parsePublicRevenueAllocationReferences(
  jsonText: string,
): PublicRevenueAllocationReference[] {
  const parsed: unknown = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) {
    throw new Error(
      "public_budget_revenue_allocations.jsonが配列ではありません。",
    );
  }
  return parsed.map((value, index) => {
    const prefix =
      `public_budget_revenue_allocations.json ${index + 1}件目`;
    if (typeof value !== "object" || value === null) {
      throw new Error(`${prefix}がオブジェクトではありません。`);
    }
    const row = value as Record<string, unknown>;
    for (const field of REQUIRED_PUBLIC_ALLOCATION_FIELDS) {
      if (!(field in row)) {
        throw new Error(`${prefix}.${field}がありません。`);
      }
    }
    const identityId = row.targetBudgetProgramIdentityId;
    const allocationId = row.allocationLinkId;
    const groupId = row.targetBudgetProgramGroupId;
    const resolutionLevel = row.targetResolutionLevel;
    if (typeof allocationId !== "string" || allocationId.length === 0) {
      throw new Error(`${prefix}.allocationLinkIdが空です。`);
    }
    if (typeof identityId !== "string" || identityId.length === 0) {
      throw new Error(
        `${prefix}.targetBudgetProgramIdentityIdが空です。`,
      );
    }
    if (
      resolutionLevel !== "exact_group" &&
      resolutionLevel !== "public_identity"
    ) {
      throw new Error(`${prefix}.targetResolutionLevelが不正です。`);
    }
    if (
      groupId !== null &&
      (typeof groupId !== "string" || groupId.length === 0)
    ) {
      throw new Error(
        `${prefix}.targetBudgetProgramGroupIdが不正です。`,
      );
    }
    if (resolutionLevel === "exact_group" && groupId === null) {
      throw new Error(`${prefix}のexact_groupにgroup IDがありません。`);
    }
    if (resolutionLevel === "public_identity" && groupId !== null) {
      throw new Error(
        `${prefix}のpublic_identityにgroup IDが設定されています。`,
      );
    }
    return {
      allocationId,
      identityId,
      groupId,
      resolutionLevel,
    };
  });
}

function departmentDisplayName(
  rawName: string,
  mappingsByRawName: ReadonlyMap<string, DepartmentNameMapping>,
): string {
  const mapping = mappingsByRawName.get(rawName);
  if (!mapping || mapping.mapping_status === "needs_review") {
    return "";
  }
  if (mapping.department_display_name.includes("＊")) {
    throw new Error(
      `内部部署略称を公開できません: ${mapping.department_display_name}`,
    );
  }
  return mapping.department_display_name;
}

function assertMemberMatchesGroup(
  member: IdentityMember,
  group: CoreProgramGroup,
): void {
  if (
    member.groupId !== group.id ||
    member.budgetItemKey !== group.budgetItemKey ||
    member.majorProgramName !== group.majorProgramName ||
    member.budgetProgramName !== group.budgetProgramName ||
    member.departmentName !== group.departmentName ||
    member.amountThousandYen !== group.totalAmountThousandYen
  ) {
    throw new Error(
      `identity memberとprogram groupが一致しません: ${member.groupId}`,
    );
  }
}

function assertGroupMatchesPrograms(
  group: CoreProgramGroup,
  programs: readonly CoreProgram[],
): void {
  if (programs.length !== group.memberProgramCount) {
    throw new Error(
      `${group.id}のmember_program_countがprogram行数と一致しません。`,
    );
  }
  const amount = programs.reduce(
    (total, program) =>
      safeAdd(total, program.amountThousandYen, `${group.id}.amount`),
    0,
  );
  if (
    amount !== group.totalAmountThousandYen ||
    programs.some(
      (program) =>
        program.groupId !== group.id ||
        program.budgetItemKey !== group.budgetItemKey ||
        program.accountCode !== group.accountCode,
    )
  ) {
    throw new Error(`${group.id}とprogram行の内容が一致しません。`);
  }
}

function extendPublicPrograms(
  publicProgramsCsv: string,
  programsById: ReadonlyMap<string, CoreProgram>,
  identityIdByGroupId: ReadonlyMap<string, string>,
): string {
  const table = parsePublicProgramsTable(publicProgramsCsv);
  if (table.rows.length !== programsById.size) {
    throw new Error(
      "public_budget_programs.csvとbudget_programs.csvの行数が一致しません。",
    );
  }
  const seenProgramIds = new Set<string>();
  const outputRows = table.rows.map((row, index) => {
    const prefix = `public_budget_programs.csv ${index + 1}行目`;
    const programId = requiredText(row.program_id, `${prefix}.program_id`);
    if (seenProgramIds.has(programId)) {
      throw new Error(`program_idが重複しています: ${programId}`);
    }
    seenProgramIds.add(programId);
    const program = programsById.get(programId);
    if (!program) {
      throw new Error(
        `公開program_idがコアに存在しません: ${programId}`,
      );
    }
    const identityId = identityIdByGroupId.get(program.groupId);
    if (!identityId) {
      throw new Error(
        `programのidentityが存在しません: ${programId}`,
      );
    }
    if (
      row.budget_item_key !== program.budgetItemKey ||
      row.account_code !== program.accountCode ||
      parseInteger(
        row.amount_thousand_yen,
        `${prefix}.amount_thousand_yen`,
      ) !== program.amountThousandYen
    ) {
      throw new Error(`公開programとコアが一致しません: ${programId}`);
    }
    const existingIdentityId =
      row.budget_program_identity_id?.trim() ?? "";
    if (existingIdentityId && existingIdentityId !== identityId) {
      throw new Error(
        `既存のbudget_program_identity_idが一致しません: ${programId}`,
      );
    }
    return {
      ...row,
      budget_program_identity_id: identityId,
    };
  });
  if (seenProgramIds.size !== programsById.size) {
    throw new Error(
      "budget_programs.csvの全program_idを公開CSVへ接続できません。",
    );
  }
  const output = stringify(outputRows, {
    columns: [...PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY],
    header: true,
    record_delimiter: "unix",
  });
  validatePublicBudgetProgramIdentityExtension(
    publicProgramsCsv,
    output,
    new Set(identityIdByGroupId.values()),
  );
  return output;
}

export function validatePublicBudgetProgramIdentityExtension(
  beforeCsv: string,
  afterCsv: string,
  publicIdentityIds: ReadonlySet<string>,
): void {
  const before = parsePublicProgramsTable(beforeCsv);
  const after = parseCsvTable(
    afterCsv,
    PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
    "public_budget_programs.csv",
  );
  if (before.rows.length !== after.rows.length) {
    throw new Error(
      "identity列追加の前後でpublic program行数が変わりました。",
    );
  }
  for (let index = 0; index < before.rows.length; index += 1) {
    for (const column of PUBLIC_BUDGET_PROGRAM_COLUMNS) {
      if (before.rows[index][column] !== after.rows[index][column]) {
        throw new Error(
          `既存公開program値が変わりました: row=${index + 1}, ` +
            `column=${column}`,
        );
      }
    }
    const identityId = requiredText(
      after.rows[index].budget_program_identity_id,
      `public_budget_programs.csv ${index + 1}行目.` +
        "budget_program_identity_id",
    );
    if (!publicIdentityIds.has(identityId)) {
      throw new Error(
        `公開programのidentityが公開identityに存在しません: ${identityId}`,
      );
    }
  }
}

export function buildPublicBudgetProgramIdentities(
  input: PublicBudgetProgramIdentityInput,
  options: PublicBudgetProgramIdentityBuildOptions = {},
): PublicBudgetProgramIdentityBuildResult {
  const coreIdentities = parseCoreIdentities(input.identitiesCsv);
  const members = parseIdentityMembers(input.identityMembersCsv);
  const groups = parseCoreProgramGroups(input.programGroupsCsv);
  const programs = parseCorePrograms(input.programsCsv);
  const items = parseCoreBudgetItems(input.itemsCsv);
  const allocations = parsePublicRevenueAllocationReferences(
    input.publicRevenueAllocationsJson,
  );
  const departmentMappings = parseDepartmentNameMap(
    input.departmentMapCsv,
  );

  const identitiesById = indexUnique(
    coreIdentities,
    (identity) => identity.id,
    "budget_program_identity_id",
  );
  const groupsById = indexUnique(
    groups,
    (group) => group.id,
    "budget_program_group_id",
  );
  const programsById = indexUnique(
    programs,
    (program) => program.id,
    "program_id",
  );
  const itemsByKey = indexUnique(
    items,
    (item) => item.budgetItemKey,
    "budget_item_key",
  );
  const mappingsByRawName = new Map(
    departmentMappings.map((mapping) => [
      mapping.department_name_raw,
      mapping,
    ]),
  );
  const membersByIdentityId = groupBy(
    members,
    (member) => member.identityId,
  );
  const programsByGroupId = groupBy(
    programs,
    (program) => program.groupId,
  );
  const memberByGroupId = indexUnique(
    members,
    (member) => member.groupId,
    "identity memberのbudget_program_group_id",
  );
  const allocationsByIdentityId = groupBy(
    allocations,
    (allocation) => allocation.identityId,
  );
  indexUnique(
    allocations,
    (allocation) => allocation.allocationId,
    "allocationLinkId",
  );

  if (
    memberByGroupId.size !== groupsById.size ||
    members.length !== groups.length
  ) {
    throw new Error(
      "すべてのbudget_program_group_idがちょうど1つのidentityに属していません。",
    );
  }
  for (const group of groups) {
    const member = memberByGroupId.get(group.id);
    if (!member || !identitiesById.has(member.identityId)) {
      throw new Error(`groupのidentityが存在しません: ${group.id}`);
    }
    assertMemberMatchesGroup(member, group);
    assertGroupMatchesPrograms(
      group,
      programsByGroupId.get(group.id) ?? [],
    );
  }
  for (const allocation of allocations) {
    const identity = identitiesById.get(allocation.identityId);
    if (!identity) {
      throw new Error(
        `allocationのidentityが存在しません: ${allocation.identityId}`,
      );
    }
    if (allocation.resolutionLevel === "exact_group") {
      const member = memberByGroupId.get(allocation.groupId ?? "");
      if (!member || member.identityId !== allocation.identityId) {
        throw new Error(
          `allocationのgroupとidentityが一致しません: ` +
            allocation.identityId,
        );
      }
    } else if (identity.memberGroupCount < 2) {
      throw new Error(
        `public_identityのmember_group_countが2未満です: ` +
          identity.id,
      );
    }
  }

  const publicIdentities = coreIdentities.map((identity) => {
    const identityMembers = membersByIdentityId.get(identity.id) ?? [];
    if (identityMembers.length !== identity.memberGroupCount) {
      throw new Error(
        `${identity.id}のmember_group_countがmember行数と一致しません。`,
      );
    }
    const identityGroups = identityMembers.map((member) => {
      const group = groupsById.get(member.groupId);
      if (!group) {
        throw new Error(`identityのgroupが存在しません: ${member.groupId}`);
      }
      return group;
    });
    const item = itemsByKey.get(identity.budgetItemKey);
    if (!item) {
      throw new Error(
        `identityのbudget_item_keyが存在しません: ` +
          identity.budgetItemKey,
      );
    }
    if (
      item.fiscalYear !== identity.fiscalYear ||
      item.accountCode !== identity.accountCode ||
      item.accountName !== identity.accountName ||
      identityGroups.some(
        (group) =>
          group.fiscalYear !== identity.fiscalYear ||
          group.accountCode !== identity.accountCode ||
          group.accountName !== identity.accountName ||
          group.budgetItemKey !== identity.budgetItemKey,
      )
    ) {
      throw new Error(`${identity.id}の会計・目境界が一致しません。`);
    }
    const amount = identityGroups.reduce(
      (total, group) =>
        safeAdd(
          total,
          group.totalAmountThousandYen,
          `${identity.id}.amount_thousand_yen`,
        ),
      0,
    );
    if (amount !== identity.totalAmountThousandYen) {
      throw new Error(`${identity.id}の金額がコアidentityと一致しません。`);
    }
    const memberProgramCount = identityGroups.reduce(
      (total, group) =>
        safeAdd(
          total,
          group.memberProgramCount,
          `${identity.id}.member_program_count`,
        ),
      0,
    );
    const relatedAllocations =
      allocationsByIdentityId.get(identity.id) ?? [];
    const fallbackProgramName =
      identityGroups[0]?.budgetProgramName ?? "";
    const displayProgramName =
      identity.displayProgramName.trim() || fallbackProgramName;
    requiredText(
      displayProgramName,
      `${identity.id}.display_program_name`,
    );

    return {
      budget_program_identity_id: identity.id,
      fiscal_year: identity.fiscalYear,
      account_code: identity.accountCode,
      account_name: identity.accountName,
      budget_side: item.budgetSide,
      budget_item_key: identity.budgetItemKey,
      kan_code: item.kanCode,
      kan_name: item.kanName,
      kou_code: item.kouCode,
      kou_name: item.kouName,
      moku_code: item.mokuCode,
      moku_name: item.mokuName,
      display_program_name: displayProgramName,
      department_display_name: departmentDisplayName(
        identity.departmentName,
        mappingsByRawName,
      ),
      amount_thousand_yen: amount,
      member_group_count: identityGroups.length,
      member_program_count: memberProgramCount,
      related_revenue_count: relatedAllocations.length,
      has_public_identity_resolution: relatedAllocations.some(
        (allocation) =>
          allocation.resolutionLevel === "public_identity",
      ),
      is_zero_amount: amount === 0,
      source_type: "derived_public",
    } satisfies PublicBudgetProgramIdentity;
  });

  const identityIdByGroupId = new Map(
    members.map((member) => [member.groupId, member.identityId]),
  );
  const publicProgramsCsv = extendPublicPrograms(
    input.publicProgramsCsv,
    programsById,
    identityIdByGroupId,
  );
  const accountTotalsThousandYen: Record<string, number> = {};
  let totalAmountThousandYen = 0;
  for (const identity of publicIdentities) {
    totalAmountThousandYen = safeAdd(
      totalAmountThousandYen,
      identity.amount_thousand_yen,
      "totalAmountThousandYen",
    );
    accountTotalsThousandYen[identity.account_code] = safeAdd(
      accountTotalsThousandYen[identity.account_code] ?? 0,
      identity.amount_thousand_yen,
      `${identity.account_code}.totalAmountThousandYen`,
    );
  }
  const publicIdentityResolutionAllocations = allocations.filter(
    (allocation) => allocation.resolutionLevel === "public_identity",
  );
  const validation: PublicBudgetProgramIdentityValidation = {
    identityRowCount: publicIdentities.length,
    uniqueIdentityIdCount: new Set(
      publicIdentities.map(
        (identity) => identity.budget_program_identity_id,
      ),
    ).size,
    groupRowCount: groups.length,
    uniqueMemberGroupIdCount: memberByGroupId.size,
    programRowCount: programs.length,
    publicProgramRowCount: parsePublicProgramsTable(
      publicProgramsCsv,
    ).rows.length,
    allocationRowCount: allocations.length,
    multipleGroupIdentityCount: publicIdentities.filter(
      (identity) => identity.member_group_count >= 2,
    ).length,
    relatedRevenueIdentityCount: publicIdentities.filter(
      (identity) => identity.related_revenue_count > 0,
    ).length,
    publicIdentityResolutionIdentityCount: publicIdentities.filter(
      (identity) => identity.has_public_identity_resolution,
    ).length,
    publicIdentityResolutionAllocationCount:
      publicIdentityResolutionAllocations.length,
    zeroAmountIdentityCount: publicIdentities.filter(
      (identity) => identity.is_zero_amount,
    ).length,
    blankDepartmentDisplayNameCount: publicIdentities.filter(
      (identity) => identity.department_display_name.length === 0,
    ).length,
    totalAmountThousandYen,
    accountTotalsThousandYen,
    isPass: false,
  };

  const structuralPass =
    validation.uniqueIdentityIdCount === validation.identityRowCount &&
    validation.identityRowCount === coreIdentities.length &&
    validation.groupRowCount === validation.uniqueMemberGroupIdCount &&
    validation.publicProgramRowCount === validation.programRowCount;
  const productionPass =
    validation.identityRowCount ===
      EXPECTED_PUBLIC_BUDGET_PROGRAM_IDENTITY_ROW_COUNT &&
    validation.programRowCount ===
      EXPECTED_PUBLIC_BUDGET_PROGRAM_ROW_COUNT &&
    validation.multipleGroupIdentityCount ===
      EXPECTED_PUBLIC_MULTIPLE_GROUP_IDENTITY_COUNT &&
    validation.allocationRowCount ===
      EXPECTED_PUBLIC_BUDGET_REVENUE_ALLOCATION_ROW_COUNT &&
    validation.publicIdentityResolutionAllocationCount ===
      EXPECTED_PUBLIC_IDENTITY_RESOLUTION_ALLOCATION_COUNT &&
    validation.totalAmountThousandYen ===
      EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN &&
    Object.entries(EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN).every(
      ([accountCode, amount]) =>
        validation.accountTotalsThousandYen[accountCode] === amount,
    ) &&
    Object.keys(validation.accountTotalsThousandYen).length ===
      Object.keys(EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN).length;
  validation.isPass =
    structuralPass &&
    (options.enforceProductionExpectations ?? true
      ? productionPass
      : true);
  if (!validation.isPass) {
    throw new Error(
      "public_budget_program_identities.csvの検証に失敗しました。",
    );
  }

  return {
    identities: publicIdentities,
    publicProgramsCsv,
    validation,
  };
}

export function serializePublicBudgetProgramIdentities(
  identities: readonly PublicBudgetProgramIdentity[],
): string {
  return stringify(
    identities.map((identity) => ({
      ...identity,
      has_public_identity_resolution: String(
        identity.has_public_identity_resolution,
      ),
      is_zero_amount: String(identity.is_zero_amount),
    })),
    {
      columns: [...PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS],
      header: true,
      record_delimiter: "unix",
    },
  );
}

export function validatePublicBudgetProgramIdentityCsv(
  csvText: string,
  expected: readonly PublicBudgetProgramIdentity[],
): void {
  const { rows } = parseCsvTable(
    csvText,
    PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS,
    "public_budget_program_identities.csv",
  );
  if (rows.length !== expected.length) {
    throw new Error(
      "public_budget_program_identities.csvの行数が一致しません。",
    );
  }
  for (let index = 0; index < rows.length; index += 1) {
    const expectedRow = expected[index] as unknown as Record<
      string,
      string | number | boolean
    >;
    for (const column of PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS) {
      if (rows[index][column] !== String(expectedRow[column])) {
        throw new Error(
          `公開identityの再読込比較に失敗しました: ` +
            `row=${index + 1}, column=${column}`,
        );
      }
    }
  }
}
