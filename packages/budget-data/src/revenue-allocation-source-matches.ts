import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { BUDGET_REVENUE_DETAIL_COLUMNS } from "./budget-revenue-details";

export const RAW_PDF_REVENUE_ALLOCATION_COLUMNS = [
  "raw_allocation_id",
  "source_file",
  "pdf_page",
  "budget_book_page",
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
  "pdf_revenue_detail_name",
  "pdf_department_name",
  "pdf_revenue_amount_thousand_yen",
  "allocation_sequence",
  "pdf_target_program_name",
  "target_budget_book_page",
  "raw_text",
  "parse_status",
  "parse_note",
] as const;

export const REVENUE_ALLOCATION_SOURCE_MATCH_EXTENSION_COLUMNS = [
  "revenue_detail_id",
  "source_match_status",
  "source_match_method",
  "source_match_note",
] as const;

export const REVENUE_ALLOCATION_SOURCE_MATCH_COLUMNS = [
  ...RAW_PDF_REVENUE_ALLOCATION_COLUMNS,
  ...REVENUE_ALLOCATION_SOURCE_MATCH_EXTENSION_COLUMNS,
] as const;

export const REVENUE_ALLOCATION_SOURCE_OVERRIDE_COLUMNS = [
  "representative_raw_allocation_id",
  "related_raw_allocation_ids",
  "account_code",
  "kan_code",
  "kou_code",
  "moku_code",
  "setsu_code",
  "saisetsu_code",
  "pdf_revenue_amount_thousand_yen",
  "pdf_department_name",
  "pdf_revenue_detail_name",
  "candidate_revenue_detail_ids",
  "selected_revenue_detail_id",
  "override_note",
] as const;

export const REVENUE_ALLOCATION_SOURCE_MATCH_STATUSES = [
  "matched",
  "ambiguous",
  "unmatched",
  "manually_confirmed",
] as const;

export const REVENUE_ALLOCATION_SOURCE_MATCH_METHODS = [
  "hierarchy_code_amount",
  "hierarchy_code_amount_department",
  "hierarchy_code_name_amount",
  "manual_override",
] as const;

export type RevenueAllocationSourceMatchStatus =
  (typeof REVENUE_ALLOCATION_SOURCE_MATCH_STATUSES)[number];

export type RevenueAllocationSourceMatchMethod =
  (typeof REVENUE_ALLOCATION_SOURCE_MATCH_METHODS)[number];

export type RawPdfRevenueAllocation = Record<
  (typeof RAW_PDF_REVENUE_ALLOCATION_COLUMNS)[number],
  string
>;

export type RevenueAllocationSourceMatch = RawPdfRevenueAllocation & {
  revenue_detail_id: string;
  source_match_status: RevenueAllocationSourceMatchStatus;
  source_match_method: RevenueAllocationSourceMatchMethod | "";
  source_match_note: string;
};

export type RevenueAllocationSourceOverride = Record<
  (typeof REVENUE_ALLOCATION_SOURCE_OVERRIDE_COLUMNS)[number],
  string
>;

export interface RevenueDetailMatchSource {
  revenue_detail_id: string;
  fiscal_year: string;
  account_code: string;
  kan_code: string;
  kou_code: string;
  moku_code: string;
  setsu_code: string;
  saisetsu_code: string;
  saisetsu_name: string;
  department_name: string;
  current_amount_thousand_yen: number;
}

export interface PdfRevenueDetailGroup {
  representativeRawAllocationId: string;
  rows: RawPdfRevenueAllocation[];
  amountThousandYen: number;
}

export interface RevenueAllocationSourceMatchDecision {
  representativeRawAllocationId: string;
  relatedRawAllocationIds: string[];
  accountCode: string;
  hierarchyKey: string;
  amountThousandYen: number;
  revenueDetailId: string;
  status: RevenueAllocationSourceMatchStatus;
  method: RevenueAllocationSourceMatchMethod | "";
  note: string;
  candidateRevenueDetailIds: string[];
}

export interface RevenueAllocationSourceMatchBuildResult {
  matches: RevenueAllocationSourceMatch[];
  overrideRows: RevenueAllocationSourceOverride[];
  decisions: RevenueAllocationSourceMatchDecision[];
}

export interface RevenueAllocationSourceMatchValidation {
  rawRowCount: number;
  outputRowCount: number;
  pdfRevenueDetailGroupCount: number;
  sourceDetailRowCount: number;
  uniqueRawAllocationIdCount: number;
  uniqueMatchedRevenueDetailIdCount: number;
  unreferencedSourceDetailCount: number;
  statusRowCounts: Record<RevenueAllocationSourceMatchStatus, number>;
  statusGroupCounts: Record<RevenueAllocationSourceMatchStatus, number>;
  methodRowCounts: Record<RevenueAllocationSourceMatchMethod, number>;
  methodGroupCounts: Record<RevenueAllocationSourceMatchMethod, number>;
  accountRowCounts: Record<string, number>;
  accountGroupCounts: Record<string, number>;
  unreferencedSourceDetailCounts: Record<string, number>;
  matchedRevenueDetailIdMissingCount: number;
  rawValueDifferenceCount: number;
  overrideRowCount: number;
  unresolvedGroupCount: number;
  isPass: boolean;
}

export interface RevenueAllocationSourceMatchReportFiles {
  rawAllocations: string;
  revenueDetails: string;
  sourceMatches: string;
  overrides: string;
}

const STRICT_HIERARCHY_FIELDS = [
  "account_code",
  "kan_code",
  "kou_code",
  "moku_code",
  "setsu_code",
  "saisetsu_code",
] as const;

const GROUP_INVARIANT_FIELDS = [
  "fiscal_year",
  ...STRICT_HIERARCHY_FIELDS,
] as const;

function parseCsvRecords(
  csvText: string,
  expectedColumns: readonly string[],
  sourceName: string,
  allowHeaderOnly = false,
): Array<Record<string, string>> {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];

  if (records.length === 0) {
    if (allowHeaderOnly && csvText.trim().length === 0) {
      return [];
    }
    throw new Error(`${sourceName}が空です。`);
  }
  if (records[0].join(",") !== expectedColumns.join(",")) {
    throw new Error(
      `${sourceName}の列が一致しません: ` +
        `${records[0].join(",")}`,
    );
  }
  if (!allowHeaderOnly && records.length === 1) {
    throw new Error(`${sourceName}にデータ行がありません。`);
  }

  return records.slice(1).map((record, rowIndex) => {
    const row: Record<string, string> = {};
    for (
      let columnIndex = 0;
      columnIndex < expectedColumns.length;
      columnIndex += 1
    ) {
      row[expectedColumns[columnIndex]] = record[columnIndex];
    }
    if (record.length !== expectedColumns.length) {
      throw new Error(
        `${sourceName}の${rowIndex + 1}行目の列数が不正です。`,
      );
    }
    return row;
  });
}

function parseInteger(value: string, fieldName: string): number {
  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`${fieldName}が整数ではありません: ${value}`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${fieldName}が安全な整数範囲外です: ${value}`);
  }
  return parsed;
}

function assertTwoDigitCode(value: string, fieldName: string): void {
  if (!/^\d{2}$/.test(value)) {
    throw new Error(`${fieldName}が2桁コードではありません: ${value}`);
  }
}

function hierarchyKey(
  row: Pick<
    RawPdfRevenueAllocation,
    (typeof STRICT_HIERARCHY_FIELDS)[number]
  >,
): string {
  return STRICT_HIERARCHY_FIELDS.map((field) => row[field]).join(
    "\u001f",
  );
}

export function parseRawPdfRevenueAllocations(
  csvText: string,
): RawPdfRevenueAllocation[] {
  const rows = parseCsvRecords(
    csvText,
    RAW_PDF_REVENUE_ALLOCATION_COLUMNS,
    "raw_pdf_revenue_allocations.csv",
  ) as RawPdfRevenueAllocation[];
  const rawAllocationIds = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const prefix = `raw_pdf_revenue_allocations.csv ${index + 1}行目`;
    if (row.raw_allocation_id.trim().length === 0) {
      throw new Error(`${prefix}.raw_allocation_idが空です。`);
    }
    if (rawAllocationIds.has(row.raw_allocation_id)) {
      throw new Error(
        `raw_allocation_idが重複しています: ${row.raw_allocation_id}`,
      );
    }
    rawAllocationIds.add(row.raw_allocation_id);
    if (row.parse_status !== "parsed") {
      throw new Error(
        `${prefix}.parse_statusがparsedではありません: ` +
          row.parse_status,
      );
    }
    if (!/^\d{4}$/.test(row.fiscal_year)) {
      throw new Error(`${prefix}.fiscal_yearが不正です。`);
    }
    for (const field of [
      "kan_code",
      "kou_code",
      "moku_code",
      "setsu_code",
      "saisetsu_code",
    ] as const) {
      assertTwoDigitCode(row[field], `${prefix}.${field}`);
    }

    const sequence = parseInteger(
      row.allocation_sequence,
      `${prefix}.allocation_sequence`,
    );
    if (sequence <= 0) {
      throw new Error(`${prefix}.allocation_sequenceが1未満です。`);
    }
    if (sequence === 1) {
      parseInteger(
        row.pdf_revenue_amount_thousand_yen,
        `${prefix}.pdf_revenue_amount_thousand_yen`,
      );
    } else if (row.pdf_revenue_amount_thousand_yen.trim() !== "") {
      throw new Error(
        `${prefix}で複数充当先へ細節金額が複製されています。`,
      );
    }
  }

  return rows;
}

export function groupRawPdfRevenueAllocations(
  rows: RawPdfRevenueAllocation[],
): PdfRevenueDetailGroup[] {
  const groups: PdfRevenueDetailGroup[] = [];
  let currentGroup: PdfRevenueDetailGroup | undefined;

  for (const row of rows) {
    const sequence = parseInteger(
      row.allocation_sequence,
      `${row.raw_allocation_id}.allocation_sequence`,
    );
    if (sequence === 1) {
      currentGroup = {
        representativeRawAllocationId: row.raw_allocation_id,
        rows: [row],
        amountThousandYen: parseInteger(
          row.pdf_revenue_amount_thousand_yen,
          `${row.raw_allocation_id}.pdf_revenue_amount_thousand_yen`,
        ),
      };
      groups.push(currentGroup);
      continue;
    }
    if (!currentGroup) {
      throw new Error(
        `allocation_sequence=${sequence}の前にsequence=1がありません: ` +
          row.raw_allocation_id,
      );
    }
    const expectedSequence = currentGroup.rows.length + 1;
    if (sequence !== expectedSequence) {
      throw new Error(
        `allocation_sequenceが連続していません: ` +
          `${row.raw_allocation_id}=${sequence}, ` +
          `expected=${expectedSequence}`,
      );
    }
    const first = currentGroup.rows[0];
    for (const field of GROUP_INVARIANT_FIELDS) {
      if (row[field] !== first[field]) {
        throw new Error(
          `同一PDF歳入細節内で${field}が変化しています: ` +
            `${currentGroup.representativeRawAllocationId} -> ` +
            row.raw_allocation_id,
        );
      }
    }
    currentGroup.rows.push(row);
  }

  return groups;
}

export function parseRevenueDetailsForAllocationMatching(
  csvText: string,
): RevenueDetailMatchSource[] {
  const rows = parseCsvRecords(
    csvText,
    BUDGET_REVENUE_DETAIL_COLUMNS,
    "budget_revenue_details.csv",
  );
  const revenueDetailIds = new Set<string>();

  return rows.map((row, index) => {
    const prefix = `budget_revenue_details.csv ${index + 1}行目`;
    if (revenueDetailIds.has(row.revenue_detail_id)) {
      throw new Error(
        `revenue_detail_idが重複しています: ` +
          row.revenue_detail_id,
      );
    }
    revenueDetailIds.add(row.revenue_detail_id);
    for (const field of [
      "kan_code",
      "kou_code",
      "moku_code",
      "setsu_code",
      "saisetsu_code",
    ] as const) {
      assertTwoDigitCode(row[field], `${prefix}.${field}`);
    }

    return {
      revenue_detail_id: row.revenue_detail_id,
      fiscal_year: row.fiscal_year,
      account_code: row.account_code,
      kan_code: row.kan_code,
      kou_code: row.kou_code,
      moku_code: row.moku_code,
      setsu_code: row.setsu_code,
      saisetsu_code: row.saisetsu_code,
      saisetsu_name: row.saisetsu_name,
      department_name: row.department_name,
      current_amount_thousand_yen: parseInteger(
        row.current_amount_thousand_yen,
        `${prefix}.current_amount_thousand_yen`,
      ),
    };
  });
}

export function parseRevenueAllocationSourceOverrides(
  csvText: string,
): RevenueAllocationSourceOverride[] {
  if (csvText.trim().length === 0) {
    return [];
  }
  const rows = parseCsvRecords(
    csvText,
    REVENUE_ALLOCATION_SOURCE_OVERRIDE_COLUMNS,
    "revenue_allocation_source_overrides.csv",
    true,
  ) as RevenueAllocationSourceOverride[];
  const representativeIds = new Set<string>();

  for (const row of rows) {
    if (row.representative_raw_allocation_id.trim().length === 0) {
      throw new Error(
        "手動補正のrepresentative_raw_allocation_idが空です。",
      );
    }
    if (representativeIds.has(row.representative_raw_allocation_id)) {
      throw new Error(
        `手動補正のrepresentative_raw_allocation_idが重複しています: ` +
          row.representative_raw_allocation_id,
      );
    }
    representativeIds.add(row.representative_raw_allocation_id);
  }
  return rows;
}

/**
 * 比較に許可された表記揺れだけを正規化する。
 * 大文字小文字、かな、漢字、語順など意味に触れる変換は行わない。
 */
export function normalizeRevenueAllocationMatchText(
  value: string,
): string {
  return value
    .replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0),
    )
    .replace(/[（﹙]/g, "(")
    .replace(/[）﹚]/g, ")")
    .replace(/＊/g, "*")
    .replace(/[･·•∙⋅]/g, "・")
    .replace(/[‐‑‒–—―−﹣－]/g, "-")
    .replace(/[\s\u3000]+/gu, "");
}

function matchesNormalizedText(
  sourceValue: string,
  candidateValue: string,
): boolean {
  const normalizedSource =
    normalizeRevenueAllocationMatchText(sourceValue);
  return (
    normalizedSource.length > 0 &&
    normalizedSource ===
      normalizeRevenueAllocationMatchText(candidateValue)
  );
}

function automaticDecision(
  group: PdfRevenueDetailGroup,
  strictHierarchyCandidates: RevenueDetailMatchSource[],
): RevenueAllocationSourceMatchDecision {
  const first = group.rows[0];
  const amountCandidates = strictHierarchyCandidates.filter(
    (candidate) =>
      candidate.current_amount_thousand_yen ===
      group.amountThousandYen,
  );
  const base = {
    representativeRawAllocationId:
      group.representativeRawAllocationId,
    relatedRawAllocationIds: group.rows.map(
      (row) => row.raw_allocation_id,
    ),
    accountCode: first.account_code,
    hierarchyKey: hierarchyKey(first),
    amountThousandYen: group.amountThousandYen,
  };

  if (amountCandidates.length === 1) {
    return {
      ...base,
      revenueDetailId: amountCandidates[0].revenue_detail_id,
      status: "matched",
      method: "hierarchy_code_amount",
      note: "strict_hierarchy_and_current_amount_unique",
      candidateRevenueDetailIds: [
        amountCandidates[0].revenue_detail_id,
      ],
    };
  }
  if (amountCandidates.length === 0) {
    return {
      ...base,
      revenueDetailId: "",
      status: "unmatched",
      method: "",
      note:
        strictHierarchyCandidates.length === 0
          ? "no_candidate_in_strict_hierarchy"
          : `no_candidate_with_same_current_amount;` +
            `hierarchy_candidates=${strictHierarchyCandidates.length}`,
      candidateRevenueDetailIds: strictHierarchyCandidates.map(
        (candidate) => candidate.revenue_detail_id,
      ),
    };
  }

  const departmentCandidates = amountCandidates.filter((candidate) =>
    matchesNormalizedText(
      first.pdf_department_name,
      candidate.department_name,
    ),
  );
  if (departmentCandidates.length === 1) {
    return {
      ...base,
      revenueDetailId: departmentCandidates[0].revenue_detail_id,
      status: "matched",
      method: "hierarchy_code_amount_department",
      note:
        "strict_hierarchy_current_amount_and_normalized_department_unique",
      candidateRevenueDetailIds: amountCandidates.map(
        (candidate) => candidate.revenue_detail_id,
      ),
    };
  }

  const nameSearchPool =
    departmentCandidates.length > 1
      ? departmentCandidates
      : amountCandidates;
  const nameCandidates = nameSearchPool.filter((candidate) =>
    matchesNormalizedText(
      first.pdf_revenue_detail_name,
      candidate.saisetsu_name,
    ),
  );
  if (nameCandidates.length === 1) {
    return {
      ...base,
      revenueDetailId: nameCandidates[0].revenue_detail_id,
      status: "matched",
      method: "hierarchy_code_name_amount",
      note:
        departmentCandidates.length > 1
          ? "strict_hierarchy_current_amount_department_and_name_unique"
          : "strict_hierarchy_current_amount_and_normalized_name_unique",
      candidateRevenueDetailIds: amountCandidates.map(
        (candidate) => candidate.revenue_detail_id,
      ),
    };
  }

  return {
    ...base,
    revenueDetailId: "",
    status: "ambiguous",
    method: "",
    note:
      `multiple_candidates_after_allowed_normalization;` +
      `amount_candidates=${amountCandidates.length};` +
      `department_candidates=${departmentCandidates.length};` +
      `name_candidates=${nameCandidates.length}`,
    candidateRevenueDetailIds: amountCandidates.map(
      (candidate) => candidate.revenue_detail_id,
    ),
  };
}

function sameStrictHierarchy(
  group: PdfRevenueDetailGroup,
  detail: RevenueDetailMatchSource,
): boolean {
  const first = group.rows[0];
  return (
    detail.fiscal_year === first.fiscal_year &&
    STRICT_HIERARCHY_FIELDS.every(
      (field) => detail[field] === first[field],
    )
  );
}

function buildOverrideRow(
  group: PdfRevenueDetailGroup,
  decision: RevenueAllocationSourceMatchDecision,
  existingOverride?: RevenueAllocationSourceOverride,
): RevenueAllocationSourceOverride {
  const first = group.rows[0];
  return {
    representative_raw_allocation_id:
      group.representativeRawAllocationId,
    related_raw_allocation_ids: group.rows
      .map((row) => row.raw_allocation_id)
      .join("|"),
    account_code: first.account_code,
    kan_code: first.kan_code,
    kou_code: first.kou_code,
    moku_code: first.moku_code,
    setsu_code: first.setsu_code,
    saisetsu_code: first.saisetsu_code,
    pdf_revenue_amount_thousand_yen: String(
      group.amountThousandYen,
    ),
    pdf_department_name: first.pdf_department_name,
    pdf_revenue_detail_name: first.pdf_revenue_detail_name,
    candidate_revenue_detail_ids:
      decision.candidateRevenueDetailIds.join("|"),
    selected_revenue_detail_id:
      existingOverride?.selected_revenue_detail_id ?? "",
    override_note:
      existingOverride?.override_note || decision.note,
  };
}

export function transformRevenueAllocationSourceMatches(
  rawRows: RawPdfRevenueAllocation[],
  details: RevenueDetailMatchSource[],
  overrides: RevenueAllocationSourceOverride[] = [],
): RevenueAllocationSourceMatchBuildResult {
  const groups = groupRawPdfRevenueAllocations(rawRows);
  const detailsByHierarchy = new Map<
    string,
    RevenueDetailMatchSource[]
  >();
  const detailsById = new Map(
    details.map((detail) => [detail.revenue_detail_id, detail]),
  );
  for (const detail of details) {
    const key = hierarchyKey(detail);
    const candidates = detailsByHierarchy.get(key) ?? [];
    candidates.push(detail);
    detailsByHierarchy.set(key, candidates);
  }

  const groupsByRepresentativeId = new Map(
    groups.map((group) => [
      group.representativeRawAllocationId,
      group,
    ]),
  );
  const overridesByRepresentativeId = new Map(
    overrides.map((override) => [
      override.representative_raw_allocation_id,
      override,
    ]),
  );
  for (const override of overrides) {
    if (
      !groupsByRepresentativeId.has(
        override.representative_raw_allocation_id,
      )
    ) {
      throw new Error(
        `手動補正のPDF歳入細節が現在のraw入力に存在しません: ` +
          override.representative_raw_allocation_id,
      );
    }
  }

  const matches: RevenueAllocationSourceMatch[] = [];
  const overrideRows: RevenueAllocationSourceOverride[] = [];
  const decisions: RevenueAllocationSourceMatchDecision[] = [];

  for (const group of groups) {
    const first = group.rows[0];
    const strictHierarchyCandidates =
      detailsByHierarchy.get(hierarchyKey(first)) ?? [];
    const existingOverride = overridesByRepresentativeId.get(
      group.representativeRawAllocationId,
    );
    const selectedRevenueDetailId =
      existingOverride?.selected_revenue_detail_id.trim() ?? "";
    let decision: RevenueAllocationSourceMatchDecision;

    if (selectedRevenueDetailId.length > 0) {
      const selectedDetail = detailsById.get(
        selectedRevenueDetailId,
      );
      if (!selectedDetail) {
        throw new Error(
          `手動補正のrevenue_detail_idが存在しません: ` +
            selectedRevenueDetailId,
        );
      }
      if (!sameStrictHierarchy(group, selectedDetail)) {
        throw new Error(
          `手動補正が同一会計・同一階層の外を指しています: ` +
            `${group.representativeRawAllocationId} -> ` +
            selectedRevenueDetailId,
        );
      }
      decision = {
        representativeRawAllocationId:
          group.representativeRawAllocationId,
        relatedRawAllocationIds: group.rows.map(
          (row) => row.raw_allocation_id,
        ),
        accountCode: first.account_code,
        hierarchyKey: hierarchyKey(first),
        amountThousandYen: group.amountThousandYen,
        revenueDetailId: selectedRevenueDetailId,
        status: "manually_confirmed",
        method: "manual_override",
        note:
          existingOverride?.override_note.trim() ||
          "manual_override_confirmed",
        candidateRevenueDetailIds: strictHierarchyCandidates.map(
          (candidate) => candidate.revenue_detail_id,
        ),
      };
    } else {
      decision = automaticDecision(
        group,
        strictHierarchyCandidates,
      );
    }
    decisions.push(decision);

    if (
      decision.status === "ambiguous" ||
      decision.status === "unmatched" ||
      decision.status === "manually_confirmed"
    ) {
      overrideRows.push(
        buildOverrideRow(group, decision, existingOverride),
      );
    }

    for (
      let rowIndex = 0;
      rowIndex < group.rows.length;
      rowIndex += 1
    ) {
      const row = group.rows[rowIndex];
      matches.push({
        ...row,
        revenue_detail_id: decision.revenueDetailId,
        source_match_status: decision.status,
        source_match_method: decision.method,
        source_match_note:
          rowIndex === 0
            ? decision.note
            : `${decision.note};` +
              `inherited_from_allocation_sequence_1=` +
              group.representativeRawAllocationId,
      });
    }
  }

  return {
    matches,
    overrideRows,
    decisions,
  };
}

function countBy<T extends string>(
  values: readonly T[],
  initialValues: readonly T[] = [],
): Record<T, number> {
  const counts = Object.fromEntries(
    initialValues.map((value) => [value, 0]),
  ) as Record<T, number>;
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function validateRevenueAllocationSourceMatches(
  rawRows: RawPdfRevenueAllocation[],
  details: RevenueDetailMatchSource[],
  result: RevenueAllocationSourceMatchBuildResult,
): RevenueAllocationSourceMatchValidation {
  const detailsById = new Map(
    details.map((detail) => [detail.revenue_detail_id, detail]),
  );
  const uniqueRawAllocationIds = new Set<string>();
  const uniqueMatchedRevenueDetailIds = new Set<string>();
  let matchedRevenueDetailIdMissingCount = 0;
  let rawValueDifferenceCount = 0;

  for (
    let index = 0;
    index < result.matches.length;
    index += 1
  ) {
    const match = result.matches[index];
    const raw = rawRows[index];
    uniqueRawAllocationIds.add(match.raw_allocation_id);
    if (!raw) {
      rawValueDifferenceCount += 1;
      continue;
    }
    for (const column of RAW_PDF_REVENUE_ALLOCATION_COLUMNS) {
      if (match[column] !== raw[column]) {
        rawValueDifferenceCount += 1;
      }
    }
    if (
      match.source_match_status === "matched" ||
      match.source_match_status === "manually_confirmed"
    ) {
      const detail = detailsById.get(match.revenue_detail_id);
      if (!detail) {
        matchedRevenueDetailIdMissingCount += 1;
      } else {
        uniqueMatchedRevenueDetailIds.add(match.revenue_detail_id);
        const validationGroup: PdfRevenueDetailGroup = {
          representativeRawAllocationId: raw.raw_allocation_id,
          rows: [raw],
          amountThousandYen: 0,
        };
        if (!sameStrictHierarchy(validationGroup, detail)) {
          matchedRevenueDetailIdMissingCount += 1;
        }
      }
    }
  }

  const statusRowCounts = countBy(
    result.matches.map((match) => match.source_match_status),
    REVENUE_ALLOCATION_SOURCE_MATCH_STATUSES,
  );
  const statusGroupCounts = countBy(
    result.decisions.map((decision) => decision.status),
    REVENUE_ALLOCATION_SOURCE_MATCH_STATUSES,
  );
  const methodRowCounts = countBy(
    result.matches
      .map((match) => match.source_match_method)
      .filter(
        (method): method is RevenueAllocationSourceMatchMethod =>
          method !== "",
      ),
    REVENUE_ALLOCATION_SOURCE_MATCH_METHODS,
  );
  const methodGroupCounts = countBy(
    result.decisions
      .map((decision) => decision.method)
      .filter(
        (method): method is RevenueAllocationSourceMatchMethod =>
          method !== "",
      ),
    REVENUE_ALLOCATION_SOURCE_MATCH_METHODS,
  );
  const accountRowCounts = countBy(
    result.matches.map((match) => match.account_code),
  );
  const accountGroupCounts = countBy(
    result.decisions.map((decision) => decision.accountCode),
  );
  const unreferencedSourceDetailCounts: Record<string, number> = {};
  for (const detail of details) {
    if (
      !uniqueMatchedRevenueDetailIds.has(detail.revenue_detail_id)
    ) {
      unreferencedSourceDetailCounts[detail.account_code] =
        (unreferencedSourceDetailCounts[detail.account_code] ?? 0) +
        1;
    }
  }
  const unresolvedGroupCount =
    statusGroupCounts.ambiguous + statusGroupCounts.unmatched;
  const rawAndOutputRowsMatch =
    rawRows.length === result.matches.length;

  return {
    rawRowCount: rawRows.length,
    outputRowCount: result.matches.length,
    pdfRevenueDetailGroupCount: result.decisions.length,
    sourceDetailRowCount: details.length,
    uniqueRawAllocationIdCount: uniqueRawAllocationIds.size,
    uniqueMatchedRevenueDetailIdCount:
      uniqueMatchedRevenueDetailIds.size,
    unreferencedSourceDetailCount:
      details.length - uniqueMatchedRevenueDetailIds.size,
    statusRowCounts,
    statusGroupCounts,
    methodRowCounts,
    methodGroupCounts,
    accountRowCounts,
    accountGroupCounts,
    unreferencedSourceDetailCounts,
    matchedRevenueDetailIdMissingCount,
    rawValueDifferenceCount,
    overrideRowCount: result.overrideRows.length,
    unresolvedGroupCount,
    isPass:
      rawAndOutputRowsMatch &&
      uniqueRawAllocationIds.size === rawRows.length &&
      matchedRevenueDetailIdMissingCount === 0 &&
      rawValueDifferenceCount === 0 &&
      unresolvedGroupCount === 0,
  };
}

export function serializeRevenueAllocationSourceMatches(
  matches: RevenueAllocationSourceMatch[],
): string {
  return stringify(matches, {
    columns: [...REVENUE_ALLOCATION_SOURCE_MATCH_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

export function serializeRevenueAllocationSourceOverrides(
  overrides: RevenueAllocationSourceOverride[],
): string {
  return stringify(overrides, {
    columns: [...REVENUE_ALLOCATION_SOURCE_OVERRIDE_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

function validateSerializedRows(
  csvText: string,
  expectedColumns: readonly string[],
  expectedRows: Array<Record<string, string>>,
  sourceName: string,
): void {
  const rows = parseCsvRecords(
    csvText,
    expectedColumns,
    sourceName,
    true,
  );
  if (rows.length !== expectedRows.length) {
    throw new Error(
      `${sourceName}の再読込行数が一致しません: ` +
        `${rows.length} != ${expectedRows.length}`,
    );
  }
  for (
    let rowIndex = 0;
    rowIndex < expectedRows.length;
    rowIndex += 1
  ) {
    for (const column of expectedColumns) {
      if (
        rows[rowIndex][column] !== expectedRows[rowIndex][column]
      ) {
        throw new Error(
          `${sourceName}の再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }
}

export function validateSerializedRevenueAllocationSourceMatches(
  csvText: string,
  matches: RevenueAllocationSourceMatch[],
): void {
  validateSerializedRows(
    csvText,
    REVENUE_ALLOCATION_SOURCE_MATCH_COLUMNS,
    matches,
    "revenue_allocation_source_matches.csv",
  );
}

export function validateSerializedRevenueAllocationSourceOverrides(
  csvText: string,
  overrides: RevenueAllocationSourceOverride[],
): void {
  validateSerializedRows(
    csvText,
    REVENUE_ALLOCATION_SOURCE_OVERRIDE_COLUMNS,
    overrides,
    "revenue_allocation_source_overrides.csv",
  );
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function unresolvedTable(
  title: string,
  status: "ambiguous" | "unmatched",
  decisions: RevenueAllocationSourceMatchDecision[],
): string[] {
  const rows = decisions.filter(
    (decision) => decision.status === status,
  );
  const lines = [`## ${title}`, ""];
  if (rows.length === 0) {
    lines.push("- 0件");
    return lines;
  }
  lines.push(
    "| raw_allocation_id | account_code | 階層 | 金額（千円） | 候補revenue_detail_id | 原因 |",
    "|---|---|---|---:|---|---|",
  );
  for (const decision of rows) {
    lines.push(
      `| ${markdownCell(decision.representativeRawAllocationId)} ` +
        `| ${markdownCell(decision.accountCode)} ` +
        `| ${markdownCell(decision.hierarchyKey.replace(/\u001f/g, "/"))} ` +
        `| ${formatNumber(decision.amountThousandYen)} ` +
        `| ${markdownCell(decision.candidateRevenueDetailIds.join(", "))} ` +
        `| ${markdownCell(decision.note)} |`,
    );
  }
  return lines;
}

export function renderRevenueAllocationSourceMatchReport(
  validation: RevenueAllocationSourceMatchValidation,
  result: RevenueAllocationSourceMatchBuildResult,
  files: RevenueAllocationSourceMatchReportFiles,
): string {
  const accountCodes = Array.from(
    new Set([
      ...Object.keys(validation.accountRowCounts),
      ...Object.keys(validation.accountGroupCounts),
      ...Object.keys(validation.unreferencedSourceDetailCounts),
    ]),
  ).sort();
  const lines = [
    "# 歳入充当事業・公式CSV明細 接続レポート",
    "",
    `**最終判定: ${validation.isPass ? "PASS" : "FAIL"}**`,
    "",
    "## 入出力",
    "",
    `- PDF抽出入力: \`${files.rawAllocations}\``,
    `- 公式CSV由来明細: \`${files.revenueDetails}\``,
    `- 接続結果: \`${files.sourceMatches}\``,
    `- 手動補正: \`${files.overrides}\``,
    "",
    "## 集計",
    "",
    "| 指標 | 件数 |",
    "|---|---:|",
    `| raw充当事業行 | ${formatNumber(validation.rawRowCount)} |`,
    `| source match行 | ${formatNumber(validation.outputRowCount)} |`,
    `| PDF歳入細節グループ | ${formatNumber(validation.pdfRevenueDetailGroupCount)} |`,
    `| CSV歳入明細 | ${formatNumber(validation.sourceDetailRowCount)} |`,
    `| 一意raw_allocation_id | ${formatNumber(validation.uniqueRawAllocationIdCount)} |`,
    `| 接続済み一意revenue_detail_id | ${formatNumber(validation.uniqueMatchedRevenueDetailIdCount)} |`,
    `| 充当事業記載から参照されないCSV明細 | ${formatNumber(validation.unreferencedSourceDetailCount)} |`,
    `| 手動補正候補行 | ${formatNumber(validation.overrideRowCount)} |`,
    "",
    "PDF側は1つの充当事業記載につき1行です。同一細節に複数の充当事業がある場合、`allocation_sequence=1`の判定を後続行へ引き継ぐため、raw行数とPDF歳入細節グループ数は一致しません。",
    "",
    "## 会計別",
    "",
    "| account_code | raw行 | PDF細節 | 参照されないCSV明細 |",
    "|---|---:|---:|---:|",
    ...accountCodes.map(
      (accountCode) =>
        `| ${accountCode} ` +
        `| ${formatNumber(validation.accountRowCounts[accountCode] ?? 0)} ` +
        `| ${formatNumber(validation.accountGroupCounts[accountCode] ?? 0)} ` +
        `| ${formatNumber(validation.unreferencedSourceDetailCounts[accountCode] ?? 0)} |`,
    ),
    "",
    "学校給食費会計は令和8年度廃止・0円でPDF抽出対象外です。参照されないCSV明細は、PDFに「充当事業」記載がない歳入を含むため、source matchのエラーにはしません。",
    "",
    "## ステータス",
    "",
    "| source_match_status | raw行 | PDF細節 |",
    "|---|---:|---:|",
    ...REVENUE_ALLOCATION_SOURCE_MATCH_STATUSES.map(
      (status) =>
        `| ${status} ` +
        `| ${formatNumber(validation.statusRowCounts[status])} ` +
        `| ${formatNumber(validation.statusGroupCounts[status])} |`,
    ),
    "",
    "## マッチ方法",
    "",
    "| source_match_method | raw行 | PDF細節 |",
    "|---|---:|---:|",
    ...REVENUE_ALLOCATION_SOURCE_MATCH_METHODS.map(
      (method) =>
        `| ${method} ` +
        `| ${formatNumber(validation.methodRowCounts[method])} ` +
        `| ${formatNumber(validation.methodGroupCounts[method])} |`,
    ),
    "",
    "## 照合規則",
    "",
    "1. `account_code`と款・項・目・節・細節コードがすべて同じ候補だけを残す。",
    "2. PDF細節金額と`current_amount_thousand_yen`が同じ候補を残す。",
    "3. 複数候補時だけ、許可された正規化後の部署名完全一致を使う。",
    "4. なお複数候補なら、許可された正規化後の細節名称完全一致を使う。",
    "5. 一意にならない場合は`ambiguous`または`unmatched`とし、ファジーマッチで強制結合しない。",
    "",
    "文字列正規化は、全角・半角スペース、連続空白、改行、丸括弧、`＊`、全角・半角数字、中黒、ハイフンの表記揺れに限定しています。大文字小文字、かな、漢字、語順、略称は変換しません。",
    "",
    "## 検証",
    "",
    `- raw行数とsource match行数: ${validation.rawRowCount === validation.outputRowCount ? "PASS" : "FAIL"}`,
    `- raw_allocation_id一意性: ${validation.uniqueRawAllocationIdCount === validation.rawRowCount ? "PASS" : "FAIL"}`,
    `- raw 25列の値の保持: ${validation.rawValueDifferenceCount === 0 ? "PASS" : `FAIL (${validation.rawValueDifferenceCount}差分)`}`,
    `- matched/manually_confirmedのrevenue_detail_id実在・同一階層: ${validation.matchedRevenueDetailIdMissingCount === 0 ? "PASS" : `FAIL (${validation.matchedRevenueDetailIdMissingCount}件)`}`,
    `- ambiguous: ${formatNumber(validation.statusGroupCounts.ambiguous)}件`,
    `- unmatched: ${formatNumber(validation.statusGroupCounts.unmatched)}件`,
    "",
    ...unresolvedTable(
      "ambiguous一覧",
      "ambiguous",
      result.decisions,
    ),
    "",
    ...unresolvedTable(
      "unmatched一覧",
      "unmatched",
      result.decisions,
    ),
    "",
    "## 手動補正",
    "",
    "`config/revenue_allocation_source_overrides.csv`には、`ambiguous`または`unmatched`の候補と、確定済み手動補正を保持します。`selected_revenue_detail_id`を指定しても、同一年度・同一会計・同一款項目節細節の外への接続は拒否します。",
    "",
  ];
  return `${lines.join("\n")}\n`;
}
