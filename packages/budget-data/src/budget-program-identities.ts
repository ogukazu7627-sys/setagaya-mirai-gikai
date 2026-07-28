import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import {
  BUDGET_PROGRAM_GROUP_COLUMNS,
  parseCandidateBudgetBookPages,
} from "./budget-program-groups";
import { normalizeTargetProgramName } from "./revenue-allocation-target-matches";

export const EXPECTED_BUDGET_PROGRAM_IDENTITY_ROW_COUNT = 1_156;
export const EXPECTED_MULTIPLE_GROUP_IDENTITY_COUNT = 7;

export const BUDGET_PROGRAM_IDENTITY_COLUMNS = [
  "budget_program_identity_id",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_item_key",
  "display_program_name",
  "normalized_program_name",
  "department_name",
  "normalized_department_name",
  "candidate_budget_book_pages",
  "total_amount_thousand_yen",
  "member_group_count",
  "source_type",
] as const;

export const BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS = [
  "budget_program_identity_id",
  "budget_program_group_id",
  "budget_item_key",
  "major_program_name",
  "budget_program_name",
  "department_name",
  "amount_thousand_yen",
  "member_order",
  "source_type",
] as const;

export interface BudgetProgramIdentitySourceGroup {
  budget_program_group_id: string;
  budget_item_key: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  major_program_name: string;
  budget_program_name: string;
  department_name: string;
  total_amount_thousand_yen: number;
  member_program_count: number;
  candidate_budget_book_pages: string;
  source_type: "derived";
}

export interface BudgetProgramIdentity {
  budget_program_identity_id: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  budget_item_key: string;
  display_program_name: string;
  normalized_program_name: string;
  department_name: string;
  normalized_department_name: string;
  candidate_budget_book_pages: string;
  total_amount_thousand_yen: number;
  member_group_count: number;
  source_type: "derived";
}

export interface BudgetProgramIdentityMember {
  budget_program_identity_id: string;
  budget_program_group_id: string;
  budget_item_key: string;
  major_program_name: string;
  budget_program_name: string;
  department_name: string;
  amount_thousand_yen: number;
  member_order: number;
  source_type: "derived";
}

export interface BudgetProgramIdentityBuildResult {
  identities: BudgetProgramIdentity[];
  members: BudgetProgramIdentityMember[];
  identityByGroupId: Map<string, BudgetProgramIdentity>;
  groupsByIdentityId: Map<string, BudgetProgramIdentitySourceGroup[]>;
}

export interface BudgetProgramIdentityValidation {
  sourceGroupCount: number;
  identityCount: number;
  memberCount: number;
  uniqueIdentityIdCount: number;
  uniqueMemberGroupIdCount: number;
  multipleGroupIdentityCount: number;
  sourceAmountTotalThousandYen: number;
  identityAmountTotalThousandYen: number;
  memberAmountTotalThousandYen: number;
  groupMembershipErrorCount: number;
  boundaryErrorCount: number;
  amountErrorCount: number;
  sourceTypeErrorCount: number;
  isPass: boolean;
}

const IDENTITY_KEY_SEPARATOR = "\u001f";

function requiredText(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName}が空です。`);
  }
  return value;
}

function parseInteger(value: string, fieldName: string): number {
  if (!/^-?\d+$/.test(value.trim())) {
    throw new Error(`${fieldName}が整数ではありません: ${value}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${fieldName}が安全な整数範囲外です: ${value}`);
  }
  return parsed;
}

function safeAdd(left: number, right: number, fieldName: string): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new Error(`${fieldName}が安全な整数範囲外です。`);
  }
  return total;
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function parseCsvRecords(
  csvText: string,
  expectedColumns: readonly string[],
  sourceName: string,
): Array<Record<string, string>> {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length < 2) {
    throw new Error(`${sourceName}にデータ行がありません。`);
  }
  if (records[0].join(",") !== expectedColumns.join(",")) {
    throw new Error(`${sourceName}の列が一致しません。`);
  }
  return records.slice(1).map((record) =>
    Object.fromEntries(
      expectedColumns.map((column, index) => [column, record[index]]),
    ),
  );
}

export function parseBudgetProgramIdentitySourceGroups(
  csvText: string,
): BudgetProgramIdentitySourceGroup[] {
  const rows = parseCsvRecords(
    csvText,
    BUDGET_PROGRAM_GROUP_COLUMNS,
    "budget_program_groups.csv",
  );
  const groupIds = new Set<string>();

  return rows.map((row, index) => {
    const prefix = `budget_program_groups.csv ${index + 1}行目`;
    const groupId = requiredText(
      row.budget_program_group_id,
      `${prefix}.budget_program_group_id`,
    );
    if (groupIds.has(groupId)) {
      throw new Error(
        `budget_program_group_idが重複しています: ${groupId}`,
      );
    }
    groupIds.add(groupId);
    const candidatePages = row.candidate_budget_book_pages;
    parseCandidateBudgetBookPages(candidatePages);
    const memberProgramCount = parseInteger(
      row.member_program_count,
      `${prefix}.member_program_count`,
    );
    if (memberProgramCount <= 0) {
      throw new Error(
        `${prefix}.member_program_countが1未満です。`,
      );
    }
    if (row.source_type !== "derived") {
      throw new Error(`${prefix}.source_typeがderivedではありません。`);
    }

    return {
      budget_program_group_id: groupId,
      budget_item_key: requiredText(
        row.budget_item_key,
        `${prefix}.budget_item_key`,
      ),
      fiscal_year: parseInteger(
        row.fiscal_year,
        `${prefix}.fiscal_year`,
      ),
      account_code: requiredText(
        row.account_code,
        `${prefix}.account_code`,
      ),
      account_name: requiredText(
        row.account_name,
        `${prefix}.account_name`,
      ),
      major_program_name: requiredText(
        row.major_program_name,
        `${prefix}.major_program_name`,
      ),
      budget_program_name: requiredText(
        row.budget_program_name,
        `${prefix}.budget_program_name`,
      ),
      department_name: requiredText(
        row.department_name,
        `${prefix}.department_name`,
      ),
      total_amount_thousand_yen: parseInteger(
        row.total_amount_thousand_yen,
        `${prefix}.total_amount_thousand_yen`,
      ),
      member_program_count: memberProgramCount,
      candidate_budget_book_pages: candidatePages,
      source_type: "derived",
    };
  });
}

export function buildBudgetProgramIdentityKey(
  group: BudgetProgramIdentitySourceGroup,
): string {
  const normalizedProgramName = normalizeTargetProgramName(
    group.budget_program_name,
  );
  const normalizedDepartmentName = normalizeTargetProgramName(
    group.department_name,
  );
  if (
    normalizedProgramName.length === 0 ||
    normalizedDepartmentName.length === 0
  ) {
    throw new Error(
      `identity名称の正規化結果が空です: ` +
        group.budget_program_group_id,
    );
  }
  const candidatePages = parseCandidateBudgetBookPages(
    group.candidate_budget_book_pages,
  ).join("|");
  return [
    String(group.fiscal_year),
    group.account_code,
    group.budget_item_key,
    normalizedProgramName,
    normalizedDepartmentName,
    candidatePages,
  ].join(IDENTITY_KEY_SEPARATOR);
}

export function buildBudgetProgramIdentityId(
  identityKey: string,
): string {
  const digest = createHash("sha256")
    .update(identityKey, "utf8")
    .digest("hex");
  return `bpi_${digest}`;
}

export function transformBudgetProgramIdentities(
  groups: BudgetProgramIdentitySourceGroup[],
): BudgetProgramIdentityBuildResult {
  const grouped = new Map<
    string,
    BudgetProgramIdentitySourceGroup[]
  >();
  for (const group of groups) {
    const key = buildBudgetProgramIdentityKey(group);
    const members = grouped.get(key) ?? [];
    members.push(group);
    grouped.set(key, members);
  }

  const identities: BudgetProgramIdentity[] = [];
  const members: BudgetProgramIdentityMember[] = [];
  const identityByGroupId = new Map<string, BudgetProgramIdentity>();
  const groupsByIdentityId = new Map<
    string,
    BudgetProgramIdentitySourceGroup[]
  >();

  const entries = Array.from(grouped.entries()).sort(([left], [right]) =>
    compareText(left, right),
  );
  for (const [key, unsortedGroups] of entries) {
    const identityGroups = [...unsortedGroups].sort((left, right) =>
      compareText(
        left.budget_program_group_id,
        right.budget_program_group_id,
      ),
    );
    const first = identityGroups[0];
    const identityId = buildBudgetProgramIdentityId(key);
    const identity: BudgetProgramIdentity = {
      budget_program_identity_id: identityId,
      fiscal_year: first.fiscal_year,
      account_code: first.account_code,
      account_name: first.account_name,
      budget_item_key: first.budget_item_key,
      display_program_name: first.budget_program_name,
      normalized_program_name: normalizeTargetProgramName(
        first.budget_program_name,
      ),
      department_name: first.department_name,
      normalized_department_name: normalizeTargetProgramName(
        first.department_name,
      ),
      candidate_budget_book_pages:
        first.candidate_budget_book_pages,
      total_amount_thousand_yen: identityGroups.reduce(
        (total, group) =>
          safeAdd(
            total,
            group.total_amount_thousand_yen,
            `${identityId}.total_amount_thousand_yen`,
          ),
        0,
      ),
      member_group_count: identityGroups.length,
      source_type: "derived",
    };
    identities.push(identity);
    groupsByIdentityId.set(identityId, identityGroups);

    identityGroups.forEach((group, index) => {
      if (identityByGroupId.has(group.budget_program_group_id)) {
        throw new Error(
          `budget_program_group_idが複数identityに属しています: ` +
            group.budget_program_group_id,
        );
      }
      identityByGroupId.set(group.budget_program_group_id, identity);
      members.push({
        budget_program_identity_id: identityId,
        budget_program_group_id: group.budget_program_group_id,
        budget_item_key: group.budget_item_key,
        major_program_name: group.major_program_name,
        budget_program_name: group.budget_program_name,
        department_name: group.department_name,
        amount_thousand_yen: group.total_amount_thousand_yen,
        member_order: index + 1,
        source_type: "derived",
      });
    });
  }

  return {
    identities,
    members,
    identityByGroupId,
    groupsByIdentityId,
  };
}

export function validateBudgetProgramIdentities(
  groups: BudgetProgramIdentitySourceGroup[],
  result: BudgetProgramIdentityBuildResult,
): BudgetProgramIdentityValidation {
  const groupsById = new Map(
    groups.map((group) => [group.budget_program_group_id, group]),
  );
  const identitiesById = new Map(
    result.identities.map((identity) => [
      identity.budget_program_identity_id,
      identity,
    ]),
  );
  const uniqueMemberGroupIds = new Set<string>();
  let groupMembershipErrorCount = 0;
  let boundaryErrorCount = 0;
  let amountErrorCount = 0;
  let sourceTypeErrorCount = 0;
  let identityAmountTotal = 0;
  let memberAmountTotal = 0;

  for (const identity of result.identities) {
    identityAmountTotal = safeAdd(
      identityAmountTotal,
      identity.total_amount_thousand_yen,
      "identityAmountTotalThousandYen",
    );
    const identityGroups =
      result.groupsByIdentityId.get(
        identity.budget_program_identity_id,
      ) ?? [];
    if (identityGroups.length !== identity.member_group_count) {
      groupMembershipErrorCount += 1;
    }
    const expectedTotal = identityGroups.reduce(
      (total, group) =>
        safeAdd(
          total,
          group.total_amount_thousand_yen,
          `${identity.budget_program_identity_id}.expected_total`,
        ),
      0,
    );
    if (expectedTotal !== identity.total_amount_thousand_yen) {
      amountErrorCount += 1;
    }
    for (const group of identityGroups) {
      if (
        group.fiscal_year !== identity.fiscal_year ||
        group.account_code !== identity.account_code ||
        group.account_name !== identity.account_name ||
        group.budget_item_key !== identity.budget_item_key ||
        normalizeTargetProgramName(group.budget_program_name) !==
          identity.normalized_program_name ||
        normalizeTargetProgramName(group.department_name) !==
          identity.normalized_department_name ||
        group.candidate_budget_book_pages !==
          identity.candidate_budget_book_pages
      ) {
        boundaryErrorCount += 1;
      }
    }
    if (identity.source_type !== "derived") {
      sourceTypeErrorCount += 1;
    }
  }

  for (const member of result.members) {
    const group = groupsById.get(member.budget_program_group_id);
    const identity = identitiesById.get(
      member.budget_program_identity_id,
    );
    if (
      !group ||
      !identity ||
      uniqueMemberGroupIds.has(member.budget_program_group_id) ||
      result.identityByGroupId.get(member.budget_program_group_id)
        ?.budget_program_identity_id !==
        member.budget_program_identity_id
    ) {
      groupMembershipErrorCount += 1;
    }
    uniqueMemberGroupIds.add(member.budget_program_group_id);
    if (
      !group ||
      member.budget_item_key !== group.budget_item_key ||
      member.major_program_name !== group.major_program_name ||
      member.budget_program_name !== group.budget_program_name ||
      member.department_name !== group.department_name ||
      member.amount_thousand_yen !==
        group.total_amount_thousand_yen
    ) {
      boundaryErrorCount += 1;
    }
    if (member.source_type !== "derived") {
      sourceTypeErrorCount += 1;
    }
    memberAmountTotal = safeAdd(
      memberAmountTotal,
      member.amount_thousand_yen,
      "memberAmountTotalThousandYen",
    );
  }
  if (uniqueMemberGroupIds.size !== groups.length) {
    groupMembershipErrorCount += 1;
  }

  const sourceAmountTotal = groups.reduce(
    (total, group) =>
      safeAdd(
        total,
        group.total_amount_thousand_yen,
        "sourceAmountTotalThousandYen",
      ),
    0,
  );
  const multipleGroupIdentityCount = result.identities.filter(
    (identity) => identity.member_group_count > 1,
  ).length;
  const isPass =
    identitiesById.size === result.identities.length &&
    result.members.length === groups.length &&
    uniqueMemberGroupIds.size === groups.length &&
    sourceAmountTotal === identityAmountTotal &&
    sourceAmountTotal === memberAmountTotal &&
    groupMembershipErrorCount === 0 &&
    boundaryErrorCount === 0 &&
    amountErrorCount === 0 &&
    sourceTypeErrorCount === 0;

  return {
    sourceGroupCount: groups.length,
    identityCount: result.identities.length,
    memberCount: result.members.length,
    uniqueIdentityIdCount: identitiesById.size,
    uniqueMemberGroupIdCount: uniqueMemberGroupIds.size,
    multipleGroupIdentityCount,
    sourceAmountTotalThousandYen: sourceAmountTotal,
    identityAmountTotalThousandYen: identityAmountTotal,
    memberAmountTotalThousandYen: memberAmountTotal,
    groupMembershipErrorCount,
    boundaryErrorCount,
    amountErrorCount,
    sourceTypeErrorCount,
    isPass,
  };
}

function serializeRows(
  rows: Array<Record<string, string | number>>,
  columns: readonly string[],
): string {
  return stringify(rows, {
    columns: [...columns],
    header: true,
    record_delimiter: "unix",
  });
}

export function serializeBudgetProgramIdentities(
  identities: BudgetProgramIdentity[],
): string {
  return serializeRows(
    identities as unknown as Array<Record<string, string | number>>,
    BUDGET_PROGRAM_IDENTITY_COLUMNS,
  );
}

export function serializeBudgetProgramIdentityMembers(
  members: BudgetProgramIdentityMember[],
): string {
  return serializeRows(
    members as unknown as Array<Record<string, string | number>>,
    BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
  );
}

function validateSerializedRows(
  csvText: string,
  expectedColumns: readonly string[],
  expectedRows: Array<Record<string, string | number>>,
  sourceName: string,
): void {
  const rows = parseCsvRecords(csvText, expectedColumns, sourceName);
  if (rows.length !== expectedRows.length) {
    throw new Error(
      `${sourceName}の再読込行数が一致しません: ` +
        `${rows.length} != ${expectedRows.length}`,
    );
  }
  for (let rowIndex = 0; rowIndex < expectedRows.length; rowIndex += 1) {
    for (const column of expectedColumns) {
      if (
        rows[rowIndex][column] !==
        String(expectedRows[rowIndex][column])
      ) {
        throw new Error(
          `${sourceName}の再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }
}

export function validateSerializedBudgetProgramIdentities(
  csvText: string,
  identities: BudgetProgramIdentity[],
): void {
  validateSerializedRows(
    csvText,
    BUDGET_PROGRAM_IDENTITY_COLUMNS,
    identities as unknown as Array<Record<string, string | number>>,
    "budget_program_identities.csv",
  );
}

export function validateSerializedBudgetProgramIdentityMembers(
  csvText: string,
  members: BudgetProgramIdentityMember[],
): void {
  validateSerializedRows(
    csvText,
    BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
    members as unknown as Array<Record<string, string | number>>,
    "budget_program_identity_members.csv",
  );
}
