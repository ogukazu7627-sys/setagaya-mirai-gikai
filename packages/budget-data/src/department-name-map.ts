import { parse } from "csv-parse/sync";

export const EXPECTED_DEPARTMENT_NAME_COUNT = 136;

export const DEPARTMENT_NAME_MAP_COLUMNS = [
  "department_name_raw",
  "parent_department_display_name",
  "section_display_name",
  "department_display_name",
  "mapping_status",
  "mapping_source",
  "mapping_note",
] as const;

export const DEPARTMENT_MAPPING_STATUSES = [
  "matched",
  "already_display",
  "needs_review",
] as const;

export const DEPARTMENT_MAPPING_SOURCES = [
  "official_pdf",
  "official_csv",
  "manual_config",
] as const;

export type DepartmentMappingStatus =
  (typeof DEPARTMENT_MAPPING_STATUSES)[number];
export type DepartmentMappingSource =
  (typeof DEPARTMENT_MAPPING_SOURCES)[number];

export interface DepartmentNameMapping {
  department_name_raw: string;
  parent_department_display_name: string;
  section_display_name: string;
  department_display_name: string;
  mapping_status: DepartmentMappingStatus;
  mapping_source: DepartmentMappingSource;
  mapping_note: string;
}

export interface DepartmentMappingCoverage {
  mappingCount: number;
  rawDepartmentNameCount: number;
  statusCounts: Record<DepartmentMappingStatus, number>;
  needsReviewCount: number;
}

function normalizeField(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?|\n/g, " ")
    .replace(/[ \t\u3000]+/g, " ")
    .trim();
}

function splitRawDepartmentName(rawName: string): {
  parentRaw: string;
  sectionRaw: string;
} {
  const separatorIndex = rawName.indexOf("＊");
  if (separatorIndex < 0) {
    return { parentRaw: rawName, sectionRaw: "" };
  }
  return {
    parentRaw: rawName.slice(0, separatorIndex),
    sectionRaw: rawName.slice(separatorIndex + 1),
  };
}

function validateMappingRow(
  mapping: DepartmentNameMapping,
  rowNumber: number,
): void {
  const rowLabel = `department_name_map.csv ${rowNumber}行目`;
  if (!mapping.department_name_raw) {
    throw new Error(`${rowLabel}: department_name_rawが空です。`);
  }
  if (
    !DEPARTMENT_MAPPING_STATUSES.includes(mapping.mapping_status)
  ) {
    throw new Error(
      `${rowLabel}: mapping_statusが不正です: ` +
        mapping.mapping_status,
    );
  }
  if (!DEPARTMENT_MAPPING_SOURCES.includes(mapping.mapping_source)) {
    throw new Error(
      `${rowLabel}: mapping_sourceが不正です: ` +
        mapping.mapping_source,
    );
  }

  const { parentRaw, sectionRaw } = splitRawDepartmentName(
    mapping.department_name_raw,
  );
  if (sectionRaw && mapping.section_display_name !== sectionRaw) {
    throw new Error(
      `${rowLabel}: ＊より後ろの課・担当名が保持されていません。`,
    );
  }
  if (!sectionRaw && mapping.section_display_name) {
    throw new Error(
      `${rowLabel}: ＊のないraw値にsection_display_nameがあります。`,
    );
  }

  if (mapping.mapping_status === "needs_review") {
    return;
  }
  if (!mapping.parent_department_display_name) {
    throw new Error(
      `${rowLabel}: parent_department_display_nameが空です。`,
    );
  }
  const expectedDisplayName = sectionRaw
    ? `${mapping.parent_department_display_name} ${sectionRaw}`
    : mapping.department_name_raw;
  if (mapping.department_display_name !== expectedDisplayName) {
    throw new Error(
      `${rowLabel}: department_display_nameが階層と一致しません。`,
    );
  }

  if (mapping.mapping_status === "matched") {
    if (mapping.mapping_source === "official_csv") {
      throw new Error(
        `${rowLabel}: matchedはofficial_csvだけを根拠にできません。`,
      );
    }
    if (
      parentRaw.normalize("NFKC") ===
      mapping.parent_department_display_name.normalize("NFKC")
    ) {
      throw new Error(
        `${rowLabel}: 正式親組織名がraw値と同じため` +
          "already_displayを使用してください。",
      );
    }
  }

  if (mapping.mapping_status === "already_display") {
    if (
      parentRaw.normalize("NFKC") !==
      mapping.parent_department_display_name.normalize("NFKC")
    ) {
      throw new Error(
        `${rowLabel}: already_displayの親組織名がraw値と異なります。`,
      );
    }
  }
}

export function parseDepartmentNameMap(
  csvText: string,
): DepartmentNameMapping[] {
  const table = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (table.length === 0) {
    throw new Error("department_name_map.csvが空です。");
  }
  const [columns, ...dataRows] = table;
  if (columns.join(",") !== DEPARTMENT_NAME_MAP_COLUMNS.join(",")) {
    throw new Error(
      "department_name_map.csvの列定義が一致しません。",
    );
  }

  const seenRawNames = new Set<string>();
  return dataRows.map((values, index) => {
    const rawMapping = Object.fromEntries(
      DEPARTMENT_NAME_MAP_COLUMNS.map((column, columnIndex) => [
        column,
        normalizeField(values[columnIndex] ?? ""),
      ]),
    ) as Record<(typeof DEPARTMENT_NAME_MAP_COLUMNS)[number], string>;
    const mapping = rawMapping as DepartmentNameMapping;
    validateMappingRow(mapping, index + 1);
    if (seenRawNames.has(mapping.department_name_raw)) {
      throw new Error(
        `department_name_rawが重複しています: ` +
          mapping.department_name_raw,
      );
    }
    seenRawNames.add(mapping.department_name_raw);
    return mapping;
  });
}

export function validateDepartmentMappingCoverage(
  rawDepartmentNames: Iterable<string>,
  mappings: readonly DepartmentNameMapping[],
): DepartmentMappingCoverage {
  const rawNames = new Set(rawDepartmentNames);
  const mappingNames = new Set(
    mappings.map((mapping) => mapping.department_name_raw),
  );
  const missing = [...rawNames].filter(
    (rawName) => !mappingNames.has(rawName),
  );
  const extra = [...mappingNames].filter(
    (rawName) => !rawNames.has(rawName),
  );
  if (missing.length > 0) {
    throw new Error(
      `部署名マッピングが不足しています: ${missing.join(", ")}`,
    );
  }
  if (extra.length > 0) {
    throw new Error(
      `部署名マッピングに未使用raw値があります: ${extra.join(", ")}`,
    );
  }

  const statusCounts = Object.fromEntries(
    DEPARTMENT_MAPPING_STATUSES.map((status) => [status, 0]),
  ) as Record<DepartmentMappingStatus, number>;
  for (const mapping of mappings) {
    statusCounts[mapping.mapping_status] += 1;
  }

  return {
    mappingCount: mappings.length,
    rawDepartmentNameCount: rawNames.size,
    statusCounts,
    needsReviewCount: statusCounts.needs_review,
  };
}

export function indexDepartmentNameMappings(
  rawDepartmentNames: Iterable<string>,
  mappings: readonly DepartmentNameMapping[],
): Map<string, DepartmentNameMapping> {
  validateDepartmentMappingCoverage(rawDepartmentNames, mappings);
  return new Map(
    mappings.map((mapping) => [
      mapping.department_name_raw,
      mapping,
    ]),
  );
}

export interface DepartmentMappingReportInput {
  mappings: readonly DepartmentNameMapping[];
  programRowCount: number;
  rawDepartmentNameCount: number;
  programStatusCounts: Record<DepartmentMappingStatus, number>;
  phase16RegressionRowCount: number;
  phase16RegressionColumnCount: number;
}

function markdownEscape(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderDepartmentMappingReport(
  input: DepartmentMappingReportInput,
): string {
  const mappingStatusCounts = Object.fromEntries(
    DEPARTMENT_MAPPING_STATUSES.map((status) => [
      status,
      input.mappings.filter(
        (mapping) => mapping.mapping_status === status,
      ).length,
    ]),
  ) as Record<DepartmentMappingStatus, number>;
  const needsReview = input.mappings.filter(
    (mapping) => mapping.mapping_status === "needs_review",
  );
  const mappingRows = input.mappings
    .map(
      (mapping) =>
        `| ${markdownEscape(mapping.department_name_raw)} | ` +
        `${markdownEscape(mapping.department_display_name || "(空欄)")} | ` +
        `\`${mapping.mapping_status}\` | ` +
        `\`${mapping.mapping_source}\` |`,
    )
    .join("\n");
  const reviewRows =
    needsReview.length === 0
      ? "- なし"
      : needsReview
          .map(
            (mapping) =>
              `- \`${mapping.department_name_raw}\`: ` +
              (mapping.mapping_note || "根拠未確定"),
          )
          .join("\n");

  return `# 令和8年度予算 部署表示名マッピングレポート

## 最終判定

**PASS**

- マッピング対象raw値: ${input.rawDepartmentNameCount.toLocaleString("en-US")}件
- マッピング設定: ${input.mappings.length.toLocaleString("en-US")}件
- \`matched\`: ${mappingStatusCounts.matched.toLocaleString("en-US")}件
- \`already_display\`: ${mappingStatusCounts.already_display.toLocaleString("en-US")}件
- \`needs_review\`: ${mappingStatusCounts.needs_review.toLocaleString("en-US")}件

## 入力と出力

- 入力: \`processed/budget_programs.csv\`（Phase 16基準）
- 根拠: \`raw/r8tousyoyosanallpage.pdf\`
- 設定: \`config/department_name_map.csv\`
- 出力: \`processed/budget_programs.csv\`

## 照合方法

1. 公式CSVの \`department_name\` をraw値として保持した。
2. \`＊\`より後ろは課・担当名として原文のまま保持した。
3. 各 \`budget_item_key\` のPDF節ページ範囲と前後ページを対象にした。
4. 内訳事業名を優先し、次に予算事業名と金額を照合した。
5. 一致したPDF説明欄の括弧内組織名を親組織名とした。
6. 同じraw値に複数の親組織候補がある場合は自動確定しない。

## 既存データ保全

| 検証 | 結果 |
| --- | --- |
| 行数 | ${input.programRowCount.toLocaleString("en-US")}行 |
| Phase 16既存列 | ${input.phase16RegressionColumnCount}列、全${input.phase16RegressionRowCount.toLocaleString("en-US")}行一致 |
| \`department_name\` | 変更なし |
| ID・行順・金額 | 変更なし |
| 追加列 | \`department_display_name\`, \`department_mapping_status\` |

## 事業行のステータス

| status | 行数 |
| --- | ---: |
| \`matched\` | ${input.programStatusCounts.matched.toLocaleString("en-US")} |
| \`already_display\` | ${input.programStatusCounts.already_display.toLocaleString("en-US")} |
| \`needs_review\` | ${input.programStatusCounts.needs_review.toLocaleString("en-US")} |

## Needs Review

${reviewRows}

## マッピング一覧

| department_name_raw | department_display_name | status | source |
| --- | --- | --- | --- |
${mappingRows}
`;
}
