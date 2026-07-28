import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { BudgetAccountsConfig } from "./budget-accounts";
import { BUDGET_ITEM_COLUMNS } from "./budget-items";
import { BUDGET_PROGRAM_COLUMNS } from "./budget-programs";
import { BUDGET_SECTION_COLUMNS } from "./budget-sections";

export const EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT = 1_166;

export const BUDGET_PROGRAM_GROUP_COLUMNS = [
  "budget_program_group_id",
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "major_program_name",
  "budget_program_name",
  "department_name",
  "total_amount_thousand_yen",
  "member_program_count",
  "candidate_budget_book_pages",
  "source_type",
] as const;

const REQUIRED_PROGRAM_COLUMNS = [
  "program_id",
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_side",
  "major_program_name",
  "budget_program_name",
  "department_name",
  "amount_thousand_yen",
  "detail_program_code",
] as const;

const GROUP_METADATA_FIELDS = [
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "major_program_name",
  "budget_program_name",
  "department_name",
] as const;

export interface BudgetProgramGroupSourceProgram {
  program_id: string;
  budget_program_group_id: string;
  budget_item_key: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  budget_side: "expenditure";
  major_program_name: string;
  budget_program_name: string;
  department_name: string;
  department_display_name: string;
  amount_thousand_yen: number;
  detail_program_code: string;
}

export interface BudgetProgramGroupSourceSection {
  budget_item_key: string;
  account_code: string;
  budget_book_page: number;
}

export interface BudgetProgramGroupSourceItem {
  budget_item_key: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  program_total_amount_thousand_yen: number;
  validation_status: string;
}

export interface BudgetProgramGroup {
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
  department_display_name_for_matching: string;
}

export interface BudgetProgramGroupValidation {
  rowCount: number;
  uniqueGroupIdCount: number;
  sourceProgramRowCount: number;
  memberProgramCountTotal: number;
  sourceAmountTotalThousandYen: number;
  groupAmountTotalThousandYen: number;
  groupsWithoutCandidatePages: number;
  accountGroupCounts: Record<string, number>;
  accountAmountTotalsThousandYen: Record<string, number>;
  itemReconciliationErrorCount: number;
  unknownAccountCount: number;
  isPass: boolean;
}

function parseCsvRecords(
  csvText: string,
  sourceName: string,
): {
  columns: string[];
  rows: Array<Record<string, string>>;
} {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length < 2) {
    throw new Error(`${sourceName}にデータ行がありません。`);
  }
  const columns = records[0];
  if (new Set(columns).size !== columns.length) {
    throw new Error(`${sourceName}の列名が重複しています。`);
  }
  return {
    columns,
    rows: records.slice(1).map((record) =>
      Object.fromEntries(
        columns.map((column, index) => [column, record[index]]),
      ),
    ),
  };
}

function assertExactColumns(
  columns: string[],
  expectedColumns: readonly string[],
  sourceName: string,
): void {
  if (columns.join(",") !== expectedColumns.join(",")) {
    throw new Error(`${sourceName}の列が一致しません。`);
  }
}

function assertRequiredColumns(
  columns: string[],
  requiredColumns: readonly string[],
  sourceName: string,
): void {
  const missing = requiredColumns.filter(
    (column) => !columns.includes(column),
  );
  if (missing.length > 0) {
    throw new Error(
      `${sourceName}の必須列がありません: ${missing.join(", ")}`,
    );
  }
}

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

function safeAdd(
  left: number,
  right: number,
  fieldName: string,
): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new Error(`${fieldName}が安全な整数範囲外です。`);
  }
  return total;
}

export function deriveBudgetProgramGroupId(
  programId: string,
  detailProgramCode: string,
): string {
  requiredText(programId, "program_id");
  if (!/^\d{2}$/.test(detailProgramCode)) {
    throw new Error(
      `detail_program_codeが2桁ではありません: ${detailProgramCode}`,
    );
  }
  const suffix = `_${detailProgramCode}`;
  if (!programId.endsWith(suffix)) {
    throw new Error(
      `program_id末尾とdetail_program_codeが一致しません: ` +
        `${programId} / ${detailProgramCode}`,
    );
  }
  return programId.slice(0, -suffix.length);
}

export function parseBudgetProgramGroupSourcePrograms(
  csvText: string,
): BudgetProgramGroupSourceProgram[] {
  const { columns, rows } = parseCsvRecords(
    csvText,
    "budget_programs.csv",
  );
  assertRequiredColumns(
    columns,
    REQUIRED_PROGRAM_COLUMNS,
    "budget_programs.csv",
  );
  if (columns.includes("budget_program_group_id")) {
    assertExactColumns(
      columns,
      BUDGET_PROGRAM_COLUMNS,
      "budget_programs.csv",
    );
  }

  return rows.map((row, index) => {
    const prefix = `budget_programs.csv ${index + 1}行目`;
    const detailProgramCode = requiredText(
      row.detail_program_code,
      `${prefix}.detail_program_code`,
    );
    const derivedGroupId = deriveBudgetProgramGroupId(
      row.program_id,
      detailProgramCode,
    );
    const existingGroupId =
      row.budget_program_group_id?.trim() ?? "";
    if (row.budget_side !== "expenditure") {
      throw new Error(`${prefix}.budget_sideがexpenditureではありません。`);
    }

    return {
      program_id: requiredText(
        row.program_id,
        `${prefix}.program_id`,
      ),
      budget_program_group_id:
        existingGroupId || derivedGroupId,
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
      budget_side: "expenditure",
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
      department_display_name:
        row.department_display_name?.trim() ?? "",
      amount_thousand_yen: parseInteger(
        row.amount_thousand_yen,
        `${prefix}.amount_thousand_yen`,
      ),
      detail_program_code: detailProgramCode,
    };
  });
}

export function parseBudgetProgramGroupSourceSections(
  csvText: string,
): BudgetProgramGroupSourceSection[] {
  const { columns, rows } = parseCsvRecords(
    csvText,
    "budget_sections.csv",
  );
  assertExactColumns(
    columns,
    BUDGET_SECTION_COLUMNS,
    "budget_sections.csv",
  );
  return rows.map((row, index) => ({
    budget_item_key: requiredText(
      row.budget_item_key,
      `budget_sections.csv ${index + 1}行目.budget_item_key`,
    ),
    account_code: requiredText(
      row.account_code,
      `budget_sections.csv ${index + 1}行目.account_code`,
    ),
    budget_book_page: parseInteger(
      row.budget_book_page,
      `budget_sections.csv ${index + 1}行目.budget_book_page`,
    ),
  }));
}

export function parseBudgetProgramGroupSourceItems(
  csvText: string,
): BudgetProgramGroupSourceItem[] {
  const { columns, rows } = parseCsvRecords(
    csvText,
    "budget_items.csv",
  );
  assertExactColumns(columns, BUDGET_ITEM_COLUMNS, "budget_items.csv");
  return rows.map((row, index) => ({
    budget_item_key: requiredText(
      row.budget_item_key,
      `budget_items.csv ${index + 1}行目.budget_item_key`,
    ),
    fiscal_year: parseInteger(
      row.fiscal_year,
      `budget_items.csv ${index + 1}行目.fiscal_year`,
    ),
    account_code: requiredText(
      row.account_code,
      `budget_items.csv ${index + 1}行目.account_code`,
    ),
    account_name: requiredText(
      row.account_name,
      `budget_items.csv ${index + 1}行目.account_name`,
    ),
    program_total_amount_thousand_yen: parseInteger(
      row.program_total_amount_thousand_yen,
      `budget_items.csv ${index + 1}行目.program_total_amount_thousand_yen`,
    ),
    validation_status: requiredText(
      row.validation_status,
      `budget_items.csv ${index + 1}行目.validation_status`,
    ),
  }));
}

export function parseCandidateBudgetBookPages(value: string): number[] {
  if (value.trim().length === 0) {
    return [];
  }
  const pages = value.split("|").map((part, index) =>
    parseInteger(
      part,
      `candidate_budget_book_pages[${index}]`,
    ),
  );
  if (
    pages.some((page) => page <= 0) ||
    new Set(pages).size !== pages.length ||
    pages.some((page, index) => index > 0 && page <= pages[index - 1])
  ) {
    throw new Error(
      `candidate_budget_book_pagesが昇順・一意ではありません: ${value}`,
    );
  }
  return pages;
}

function assertGroupMetadata(
  groupId: string,
  members: BudgetProgramGroupSourceProgram[],
): void {
  const first = members[0];
  for (const member of members.slice(1)) {
    for (const field of GROUP_METADATA_FIELDS) {
      if (member[field] !== first[field]) {
        throw new Error(
          `同一budget_program_group_id内で${field}が一致しません: ` +
            groupId,
        );
      }
    }
    if (
      member.department_display_name !==
      first.department_display_name
    ) {
      throw new Error(
        `同一budget_program_group_id内でdepartment_display_nameが` +
          `一致しません: ${groupId}`,
      );
    }
  }
}

export function transformBudgetProgramGroups(
  programs: BudgetProgramGroupSourceProgram[],
  sections: BudgetProgramGroupSourceSection[],
): BudgetProgramGroup[] {
  const pagesByItem = new Map<string, Set<number>>();
  for (const section of sections) {
    const pages = pagesByItem.get(section.budget_item_key) ?? new Set();
    pages.add(section.budget_book_page);
    pagesByItem.set(section.budget_item_key, pages);
  }
  const membersByGroup = new Map<
    string,
    BudgetProgramGroupSourceProgram[]
  >();
  for (const program of programs) {
    const members =
      membersByGroup.get(program.budget_program_group_id) ?? [];
    members.push(program);
    membersByGroup.set(program.budget_program_group_id, members);
  }

  return Array.from(membersByGroup, ([groupId, members]) => {
    assertGroupMetadata(groupId, members);
    const first = members[0];
    const candidatePages = Array.from(
      pagesByItem.get(first.budget_item_key) ?? [],
    ).sort((left, right) => left - right);
    return {
      budget_program_group_id: groupId,
      budget_item_key: first.budget_item_key,
      fiscal_year: first.fiscal_year,
      account_code: first.account_code,
      account_name: first.account_name,
      major_program_name: first.major_program_name,
      budget_program_name: first.budget_program_name,
      department_name: first.department_name,
      total_amount_thousand_yen: members.reduce(
        (total, member) =>
          safeAdd(
            total,
            member.amount_thousand_yen,
            `${groupId}.total_amount_thousand_yen`,
          ),
        0,
      ),
      member_program_count: members.length,
      candidate_budget_book_pages: candidatePages.join("|"),
      source_type: "derived",
      department_display_name_for_matching:
        first.department_display_name,
    };
  });
}

export function validateBudgetProgramGroups(
  groups: BudgetProgramGroup[],
  programs: BudgetProgramGroupSourceProgram[],
  sections: BudgetProgramGroupSourceSection[],
  items: BudgetProgramGroupSourceItem[],
  config: BudgetAccountsConfig,
): BudgetProgramGroupValidation {
  const uniqueGroupIds = new Set<string>();
  const accountCodes = new Set(
    config.accounts.map((account) => account.account_code),
  );
  const itemByKey = new Map(
    items.map((item) => [item.budget_item_key, item]),
  );
  const expectedPagesByItem = new Map<string, Set<number>>();
  for (const section of sections) {
    const pages =
      expectedPagesByItem.get(section.budget_item_key) ?? new Set();
    pages.add(section.budget_book_page);
    expectedPagesByItem.set(section.budget_item_key, pages);
  }
  const groupTotalsByItem = new Map<string, number>();
  const accountGroupCounts: Record<string, number> = {};
  const accountAmountTotalsThousandYen: Record<string, number> = {};
  let memberProgramCountTotal = 0;
  let groupAmountTotal = 0;
  let groupsWithoutCandidatePages = 0;
  let itemReconciliationErrorCount = 0;
  let unknownAccountCount = 0;

  for (const group of groups) {
    if (uniqueGroupIds.has(group.budget_program_group_id)) {
      throw new Error(
        `budget_program_group_idが重複しています: ` +
          group.budget_program_group_id,
      );
    }
    uniqueGroupIds.add(group.budget_program_group_id);
    if (!accountCodes.has(group.account_code)) {
      unknownAccountCount += 1;
    }
    const item = itemByKey.get(group.budget_item_key);
    if (
      !item ||
      item.account_code !== group.account_code ||
      item.fiscal_year !== group.fiscal_year ||
      item.account_name !== group.account_name
    ) {
      itemReconciliationErrorCount += 1;
    }
    const actualPages = parseCandidateBudgetBookPages(
      group.candidate_budget_book_pages,
    );
    const expectedPages = Array.from(
      expectedPagesByItem.get(group.budget_item_key) ?? [],
    ).sort((left, right) => left - right);
    if (actualPages.join("|") !== expectedPages.join("|")) {
      itemReconciliationErrorCount += 1;
    }
    if (actualPages.length === 0) {
      groupsWithoutCandidatePages += 1;
    }
    memberProgramCountTotal += group.member_program_count;
    groupAmountTotal = safeAdd(
      groupAmountTotal,
      group.total_amount_thousand_yen,
      "groupAmountTotalThousandYen",
    );
    groupTotalsByItem.set(
      group.budget_item_key,
      safeAdd(
        groupTotalsByItem.get(group.budget_item_key) ?? 0,
        group.total_amount_thousand_yen,
        `${group.budget_item_key}.group_total`,
      ),
    );
    accountGroupCounts[group.account_code] =
      (accountGroupCounts[group.account_code] ?? 0) + 1;
    accountAmountTotalsThousandYen[group.account_code] = safeAdd(
      accountAmountTotalsThousandYen[group.account_code] ?? 0,
      group.total_amount_thousand_yen,
      `${group.account_code}.group_total`,
    );
  }

  for (const item of items) {
    if (
      (groupTotalsByItem.get(item.budget_item_key) ?? 0) !==
      item.program_total_amount_thousand_yen
    ) {
      itemReconciliationErrorCount += 1;
    }
  }
  for (const account of config.accounts) {
    if (
      (accountAmountTotalsThousandYen[account.account_code] ?? 0) !==
      account.expected_amount_thousand_yen
    ) {
      itemReconciliationErrorCount += 1;
    }
  }

  const sourceAmountTotal = programs.reduce(
    (total, program) =>
      safeAdd(
        total,
        program.amount_thousand_yen,
        "sourceAmountTotalThousandYen",
      ),
    0,
  );

  return {
    rowCount: groups.length,
    uniqueGroupIdCount: uniqueGroupIds.size,
    sourceProgramRowCount: programs.length,
    memberProgramCountTotal,
    sourceAmountTotalThousandYen: sourceAmountTotal,
    groupAmountTotalThousandYen: groupAmountTotal,
    groupsWithoutCandidatePages,
    accountGroupCounts,
    accountAmountTotalsThousandYen,
    itemReconciliationErrorCount,
    unknownAccountCount,
    isPass:
      uniqueGroupIds.size === groups.length &&
      memberProgramCountTotal === programs.length &&
      sourceAmountTotal === groupAmountTotal &&
      itemReconciliationErrorCount === 0 &&
      unknownAccountCount === 0,
  };
}

export function serializeBudgetProgramGroups(
  groups: BudgetProgramGroup[],
): string {
  return stringify(groups, {
    columns: [...BUDGET_PROGRAM_GROUP_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

export function validateSerializedBudgetProgramGroups(
  csvText: string,
  groups: BudgetProgramGroup[],
): void {
  const { columns, rows } = parseCsvRecords(
    csvText,
    "budget_program_groups.csv",
  );
  assertExactColumns(
    columns,
    BUDGET_PROGRAM_GROUP_COLUMNS,
    "budget_program_groups.csv",
  );
  if (rows.length !== groups.length) {
    throw new Error(
      `budget_program_groups.csvの再読込行数が一致しません: ` +
        `${rows.length} != ${groups.length}`,
    );
  }
  for (let rowIndex = 0; rowIndex < groups.length; rowIndex += 1) {
    const expected = groups[rowIndex] as unknown as Record<
      string,
      string | number
    >;
    for (const column of BUDGET_PROGRAM_GROUP_COLUMNS) {
      if (rows[rowIndex][column] !== String(expected[column])) {
        throw new Error(
          `budget_program_groups.csvの再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }
}
