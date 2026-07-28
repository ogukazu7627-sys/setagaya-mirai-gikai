import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export const EXPECTED_PUBLIC_BUDGET_PROGRAM_ROW_COUNT = 1_170;
export const EXPECTED_PUBLIC_BUDGET_ITEM_ROW_COUNT = 190;
export const EXPECTED_PUBLIC_BUDGET_SECTION_ROW_COUNT = 994;
export const EXPECTED_PUBLIC_ZERO_AMOUNT_PROGRAM_COUNT = 44;
export const EXPECTED_PUBLIC_ZERO_AMOUNT_ITEM_COUNT = 10;
export const EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN = 621_033_664;

export const EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN = {
  general: 431_353_010,
  national_health_insurance: 84_206_905,
  latter_stage_elderly_healthcare: 29_414_796,
  long_term_care_insurance: 76_058_953,
  school_lunch_fee: 0,
} as const;

export const PUBLIC_BUDGET_PROGRAM_COLUMNS = [
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
] as const;

export const PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY = [
  ...PUBLIC_BUDGET_PROGRAM_COLUMNS,
  "budget_program_identity_id",
] as const;

export const FORBIDDEN_PUBLIC_BUDGET_COLUMNS = [
  "general_revenue_thousand_yen",
  "allocated_revenue_thousand_yen",
  "funding_amount",
  "national_government_amount",
  "tokyo_metropolitan_amount",
  "general_revenue_amount",
] as const;

export const BUDGET_AI_CONSTRAINTS = [
  "budget_sectionsはbudget_item_key単位、すなわち款・項・目のうち『目』全体の節別内訳です。個々のbudget_programの節別内訳ではありません。",
  "財源内訳は、歳入予算データおよび財源充当データの整備後に提供予定です。現在のデータから国費・都費・一般財源の金額を推論してはいけません。",
  "このデータは当初予算であり、実際の支出額・決算額・契約額・支払先を示すものではありません。",
] as const;

export const BUDGET_AI_REASON_CODES = [
  "FUNDING_DATA_PENDING_REVENUE_PHASE",
  "PROGRAM_SECTION_MAPPING_NOT_AVAILABLE",
  "ACTUAL_SPENDING_NOT_AVAILABLE",
  "SETTLEMENT_DATA_NOT_AVAILABLE",
  "CONTRACT_DATA_NOT_AVAILABLE",
  "VENDOR_DATA_NOT_AVAILABLE",
] as const;

export type PublicBudgetAccountCode =
  keyof typeof EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN;
export type BudgetAiReasonCode =
  (typeof BUDGET_AI_REASON_CODES)[number];
export type PublicBudgetValidationStatus = "ok" | "ok_zero_amount";

export interface PublicBudgetProgram {
  program_id: string;
  budget_item_key: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  kan_code: string;
  kan_name: string;
  kou_code: string;
  kou_name: string;
  moku_code: string;
  moku_name: string;
  major_program_name: string;
  budget_program_name: string;
  detail_program_name: string;
  department_display_name: string;
  amount_thousand_yen: number;
  is_zero_amount: boolean;
  source_type: "official_csv";
  source_file: string;
  source_row_number: number | null;
}

export interface OfficialCsvSourceReference {
  sourceType: "official_csv";
  sourceFile: string;
  sourceRowNumber: number;
}

export interface OfficialPdfSourceReference {
  sourceType: "official_pdf";
  sourceFile: string;
  pdfPage: number;
  budgetBookPage: number;
}

export interface DerivedSourceReference {
  sourceType: "derived";
}

export type PublicBudgetSourceReference =
  | OfficialCsvSourceReference
  | OfficialPdfSourceReference
  | DerivedSourceReference;

export interface PublicBudgetItemProgram {
  programId: string;
  majorProgramName: string;
  budgetProgramName: string;
  detailProgramName: string;
  departmentDisplayName: string | null;
  amountThousandYen: number;
  isZeroAmount: boolean;
  sourceReference: OfficialCsvSourceReference | null;
}

export interface PublicBudgetItemSection {
  sectionId: string;
  setsuCode: string;
  setsuName: string;
  amountThousandYen: number;
  scope: "budget_item";
  sourceReference: OfficialPdfSourceReference | null;
}

export interface PublicBudgetDataAvailability {
  funding: "pending_revenue_phase";
  actualSpending: "not_available";
  settlement: "not_available";
  contracts: "not_available";
  vendors: "not_available";
  programSectionMapping: "not_available";
}

export interface PublicBudgetItem {
  budgetItemKey: string;
  fiscalYear: number;
  accountCode: string;
  accountName: string;
  budgetSide: "expenditure";
  kan: {
    code: string;
    name: string;
  };
  kou: {
    code: string;
    name: string;
  };
  moku: {
    code: string;
    name: string;
  };
  amountThousandYen: number;
  validationStatus: PublicBudgetValidationStatus;
  programs: PublicBudgetItemProgram[];
  sections: PublicBudgetItemSection[];
  dataAvailability: PublicBudgetDataAvailability;
  sourceReferences: PublicBudgetSourceReference[];
}

export interface PublicBudgetReadModel {
  programs: PublicBudgetProgram[];
  budgetItems: PublicBudgetItem[];
}

export interface SearchPublicBudgetProgramsOptions {
  programs: readonly PublicBudgetProgram[];
  includeZeroAmount?: boolean;
  accountCode?: string;
  budgetItemKey?: string;
  limit?: number;
}

export interface BudgetAiQueryResult {
  query: string;
  programs: readonly PublicBudgetProgram[];
  budgetItems: readonly PublicBudgetItem[];
}

export interface BudgetAiAnswerableContext {
  answerable: true;
  context: {
    query: string;
    constraints: readonly [
      (typeof BUDGET_AI_CONSTRAINTS)[0],
      (typeof BUDGET_AI_CONSTRAINTS)[1],
      (typeof BUDGET_AI_CONSTRAINTS)[2],
    ];
    programs: readonly PublicBudgetProgram[];
    budgetItems: readonly PublicBudgetItem[];
  };
}

export interface BudgetAiUnanswerableResult {
  answerable: false;
  reasonCode: BudgetAiReasonCode;
  message: string;
}

export type BudgetAiContextResult =
  | BudgetAiAnswerableContext
  | BudgetAiUnanswerableResult;

export interface PublicBudgetValidation {
  publicProgramRowCount: number;
  publicBudgetItemRowCount: number;
  nestedProgramRowCount: number;
  nestedSectionRowCount: number;
  uniqueProgramIdCount: number;
  uniqueBudgetItemKeyCount: number;
  uniqueSectionIdCount: number;
  zeroAmountProgramCount: number;
  zeroAmountItemCount: number;
  programTotalAmountThousandYen: number;
  itemTotalAmountThousandYen: number;
  sectionTotalAmountThousandYen: number;
  accountProgramTotalsThousandYen: Record<string, number>;
  accountItemTotalsThousandYen: Record<string, number>;
  accountSectionTotalsThousandYen: Record<string, number>;
}

type CsvRow = Record<string, string>;

interface ParsedCsvTable {
  columns: string[];
  rows: CsvRow[];
}

interface CoreBudgetSection {
  sectionId: string;
  budgetItemKey: string;
  amountThousandYen: number;
  setsuCode: string;
  setsuName: string;
  sourceReference: OfficialPdfSourceReference | null;
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
  programTotalAmountThousandYen: number;
  sectionTotalAmountThousandYen: number;
  validationStatus: PublicBudgetValidationStatus;
  programRowCount: number;
  sectionRowCount: number;
}

const REQUIRED_PROGRAM_COLUMNS = [
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
  "amount_thousand_yen",
] as const;

const REQUIRED_SECTION_COLUMNS = [
  "section_id",
  "budget_item_key",
  "setsu_code",
  "setsu_name",
  "amount_thousand_yen",
  "source_file",
  "pdf_page",
  "budget_book_page",
] as const;

const REQUIRED_ITEM_COLUMNS = [
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_side",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "program_total_amount_thousand_yen",
  "section_total_amount_thousand_yen",
  "validation_status",
  "program_row_count",
  "section_row_count",
] as const;

const DATA_AVAILABILITY: PublicBudgetDataAvailability = {
  funding: "pending_revenue_phase",
  actualSpending: "not_available",
  settlement: "not_available",
  contracts: "not_available",
  vendors: "not_available",
  programSectionMapping: "not_available",
};

const REASON_MESSAGES: Record<BudgetAiReasonCode, string> = {
  FUNDING_DATA_PENDING_REVENUE_PHASE:
    "事業ごとの財源内訳は、歳入予算データの整備後に提供予定です。",
  PROGRAM_SECTION_MAPPING_NOT_AVAILABLE:
    "個別事業ごとの節別内訳は提供できません。節データは款・項・目のうち「目」全体の内訳です。",
  ACTUAL_SPENDING_NOT_AVAILABLE:
    "実際の支出額は当初予算データには含まれていません。",
  SETTLEMENT_DATA_NOT_AVAILABLE:
    "決算額・不用額・繰越額は当初予算データには含まれていません。",
  CONTRACT_DATA_NOT_AVAILABLE:
    "契約額・契約情報は当初予算データには含まれていません。",
  VENDOR_DATA_NOT_AVAILABLE:
    "支払先・事業者名・業者情報は当初予算データには含まれていません。",
};

function parseCsvTable(
  csvText: string,
  sourceName: string,
  requiredColumns: readonly string[],
): ParsedCsvTable {
  const table = parse(csvText, {
    bom: true,
    columns: false,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];

  if (table.length < 2) {
    throw new Error(`${sourceName}にデータ行がありません。`);
  }

  const columns = table[0];
  if (new Set(columns).size !== columns.length) {
    throw new Error(`${sourceName}の列名が重複しています。`);
  }
  const missingColumns = requiredColumns.filter(
    (column) => !columns.includes(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `${sourceName}に必要な列がありません: ${missingColumns.join(", ")}`,
    );
  }

  const rows = table.slice(1).map((values) =>
    Object.fromEntries(
      columns.map((column, index) => [column, values[index] ?? ""]),
    ),
  );
  return { columns, rows };
}

function requireText(value: string | undefined, fieldName: string): string {
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
  const normalized = value?.trim() ?? "";
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`${fieldName}が整数ではありません: ${value ?? ""}`);
  }
  const parsedValue = Number(normalized);
  if (!Number.isSafeInteger(parsedValue)) {
    throw new Error(`${fieldName}が安全な整数範囲を超えています。`);
  }
  if (options.positive && parsedValue <= 0) {
    throw new Error(`${fieldName}が正の整数ではありません。`);
  }
  if (options.nonNegative && parsedValue < 0) {
    throw new Error(`${fieldName}が0以上の整数ではありません。`);
  }
  return parsedValue;
}

function parseOptionalPositiveInteger(
  value: string | undefined,
  fieldName: string,
): number | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  return parseInteger(value, fieldName, { positive: true });
}

function parseBoolean(value: string | undefined, fieldName: string): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${fieldName}がtrueまたはfalseではありません。`);
}

function readZeroAmount(
  row: CsvRow,
  columns: readonly string[],
  amount: number,
  fieldName: string,
): boolean {
  if (!columns.includes("is_zero_amount")) {
    return amount === 0;
  }
  const isZeroAmount = parseBoolean(row.is_zero_amount, fieldName);
  if (isZeroAmount !== (amount === 0)) {
    throw new Error(`${fieldName}とamount_thousand_yenが一致しません。`);
  }
  return isZeroAmount;
}

function toOfficialCsvSourceReference(
  program: PublicBudgetProgram,
): OfficialCsvSourceReference | null {
  if (!program.source_file || program.source_row_number === null) {
    return null;
  }
  return {
    sourceType: "official_csv",
    sourceFile: program.source_file,
    sourceRowNumber: program.source_row_number,
  };
}

function parsePublicBudgetPrograms(
  csvText: string,
): PublicBudgetProgram[] {
  const { columns, rows } = parseCsvTable(
    csvText,
    "budget_programs.csv",
    REQUIRED_PROGRAM_COLUMNS,
  );

  return rows.map((row, index) => {
    const fieldPrefix = `budget_programs.csv row ${index + 1}`;
    const amount = parseInteger(
      row.amount_thousand_yen,
      `${fieldPrefix}.amount_thousand_yen`,
    );
    const mappingStatus = row.department_mapping_status?.trim();
    const departmentDisplayName =
      mappingStatus === "needs_review"
        ? ""
        : (row.department_display_name ?? "");
    const sourceType = row.source_type?.trim();
    if (sourceType && sourceType !== "official_csv") {
      throw new Error(
        `${fieldPrefix}.source_typeがofficial_csvではありません。`,
      );
    }

    return {
      program_id: requireText(
        row.program_id,
        `${fieldPrefix}.program_id`,
      ),
      budget_item_key: requireText(
        row.budget_item_key,
        `${fieldPrefix}.budget_item_key`,
      ),
      fiscal_year: parseInteger(
        row.fiscal_year,
        `${fieldPrefix}.fiscal_year`,
        { positive: true },
      ),
      account_code: requireText(
        row.account_code,
        `${fieldPrefix}.account_code`,
      ),
      account_name: requireText(
        row.account_name,
        `${fieldPrefix}.account_name`,
      ),
      kan_code: requireText(row.kan_code, `${fieldPrefix}.kan_code`),
      kan_name: requireText(row.kan_name, `${fieldPrefix}.kan_name`),
      kou_code: requireText(row.kou_code, `${fieldPrefix}.kou_code`),
      kou_name: requireText(row.kou_name, `${fieldPrefix}.kou_name`),
      moku_code: requireText(row.moku_code, `${fieldPrefix}.moku_code`),
      moku_name: requireText(row.moku_name, `${fieldPrefix}.moku_name`),
      major_program_name: requireText(
        row.major_program_name,
        `${fieldPrefix}.major_program_name`,
      ),
      budget_program_name: requireText(
        row.budget_program_name,
        `${fieldPrefix}.budget_program_name`,
      ),
      detail_program_name: requireText(
        row.detail_program_name,
        `${fieldPrefix}.detail_program_name`,
      ),
      department_display_name: departmentDisplayName,
      amount_thousand_yen: amount,
      is_zero_amount: readZeroAmount(
        row,
        columns,
        amount,
        `${fieldPrefix}.is_zero_amount`,
      ),
      source_type: "official_csv",
      source_file: row.source_file ?? "",
      source_row_number: parseOptionalPositiveInteger(
        row.source_row_number,
        `${fieldPrefix}.source_row_number`,
      ),
    };
  });
}

function parseCoreBudgetSections(csvText: string): CoreBudgetSection[] {
  const { rows } = parseCsvTable(
    csvText,
    "budget_sections.csv",
    REQUIRED_SECTION_COLUMNS,
  );

  return rows.map((row, index) => {
    const fieldPrefix = `budget_sections.csv row ${index + 1}`;
    const sourceType = row.source_type?.trim();
    if (sourceType && sourceType !== "official_pdf") {
      throw new Error(
        `${fieldPrefix}.source_typeがofficial_pdfではありません。`,
      );
    }
    const sourceFile = requireText(
      row.source_file,
      `${fieldPrefix}.source_file`,
    );
    const pdfPage = parseInteger(
      row.pdf_page,
      `${fieldPrefix}.pdf_page`,
      { positive: true },
    );
    const budgetBookPage = parseInteger(
      row.budget_book_page,
      `${fieldPrefix}.budget_book_page`,
      { positive: true },
    );

    return {
      sectionId: requireText(
        row.section_id,
        `${fieldPrefix}.section_id`,
      ),
      budgetItemKey: requireText(
        row.budget_item_key,
        `${fieldPrefix}.budget_item_key`,
      ),
      amountThousandYen: parseInteger(
        row.amount_thousand_yen,
        `${fieldPrefix}.amount_thousand_yen`,
      ),
      setsuCode: requireText(
        row.setsu_code,
        `${fieldPrefix}.setsu_code`,
      ),
      setsuName: requireText(
        row.setsu_name,
        `${fieldPrefix}.setsu_name`,
      ),
      sourceReference: {
        sourceType: "official_pdf",
        sourceFile,
        pdfPage,
        budgetBookPage,
      },
    };
  });
}

function parseValidationStatus(
  value: string | undefined,
  fieldName: string,
): PublicBudgetValidationStatus {
  if (value === "ok" || value === "ok_zero_amount") {
    return value;
  }
  throw new Error(
    `${fieldName}は公開可能なvalidation_statusではありません: ` +
      `${value ?? ""}`,
  );
}

function parseCoreBudgetItems(csvText: string): CoreBudgetItem[] {
  const { rows } = parseCsvTable(
    csvText,
    "budget_items.csv",
    REQUIRED_ITEM_COLUMNS,
  );

  return rows.map((row, index) => {
    const fieldPrefix = `budget_items.csv row ${index + 1}`;
    const budgetSide = requireText(
      row.budget_side,
      `${fieldPrefix}.budget_side`,
    );
    if (budgetSide !== "expenditure") {
      throw new Error(`${fieldPrefix}.budget_sideが歳出ではありません。`);
    }
    const sourceType = row.source_type?.trim();
    if (sourceType && sourceType !== "derived") {
      throw new Error(
        `${fieldPrefix}.source_typeがderivedではありません。`,
      );
    }

    return {
      budgetItemKey: requireText(
        row.budget_item_key,
        `${fieldPrefix}.budget_item_key`,
      ),
      fiscalYear: parseInteger(
        row.fiscal_year,
        `${fieldPrefix}.fiscal_year`,
        { positive: true },
      ),
      accountCode: requireText(
        row.account_code,
        `${fieldPrefix}.account_code`,
      ),
      accountName: requireText(
        row.account_name,
        `${fieldPrefix}.account_name`,
      ),
      budgetSide: "expenditure",
      kanCode: requireText(row.kan_code, `${fieldPrefix}.kan_code`),
      kanName: requireText(row.kan_name, `${fieldPrefix}.kan_name`),
      kouCode: requireText(row.kou_code, `${fieldPrefix}.kou_code`),
      kouName: requireText(row.kou_name, `${fieldPrefix}.kou_name`),
      mokuCode: requireText(row.moku_code, `${fieldPrefix}.moku_code`),
      mokuName: requireText(row.moku_name, `${fieldPrefix}.moku_name`),
      programTotalAmountThousandYen: parseInteger(
        row.program_total_amount_thousand_yen,
        `${fieldPrefix}.program_total_amount_thousand_yen`,
      ),
      sectionTotalAmountThousandYen: parseInteger(
        row.section_total_amount_thousand_yen,
        `${fieldPrefix}.section_total_amount_thousand_yen`,
      ),
      validationStatus: parseValidationStatus(
        row.validation_status,
        `${fieldPrefix}.validation_status`,
      ),
      programRowCount: parseInteger(
        row.program_row_count,
        `${fieldPrefix}.program_row_count`,
        { nonNegative: true },
      ),
      sectionRowCount: parseInteger(
        row.section_row_count,
        `${fieldPrefix}.section_row_count`,
        { nonNegative: true },
      ),
    };
  });
}

function groupByBudgetItemKey<T>(
  values: readonly T[],
  getKey: (value: T) => string,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = getKey(value);
    const current = grouped.get(key) ?? [];
    current.push(value);
    grouped.set(key, current);
  }
  return grouped;
}

function sourceReferenceKey(
  sourceReference: PublicBudgetSourceReference,
): string {
  if (sourceReference.sourceType === "derived") {
    return "derived";
  }
  if (sourceReference.sourceType === "official_csv") {
    return [
      sourceReference.sourceType,
      sourceReference.sourceFile,
      sourceReference.sourceRowNumber,
    ].join(":");
  }
  return [
    sourceReference.sourceType,
    sourceReference.sourceFile,
    sourceReference.pdfPage,
    sourceReference.budgetBookPage,
  ].join(":");
}

function deduplicateSourceReferences(
  sourceReferences: readonly PublicBudgetSourceReference[],
): PublicBudgetSourceReference[] {
  const seen = new Set<string>();
  return sourceReferences.filter((sourceReference) => {
    const key = sourceReferenceKey(sourceReference);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildPublicBudgetItems(
  coreItems: readonly CoreBudgetItem[],
  programs: readonly PublicBudgetProgram[],
  sections: readonly CoreBudgetSection[],
): PublicBudgetItem[] {
  const programsByItem = groupByBudgetItemKey(
    programs,
    (program) => program.budget_item_key,
  );
  const sectionsByItem = groupByBudgetItemKey(
    sections,
    (section) => section.budgetItemKey,
  );
  const itemKeys = new Set(coreItems.map((item) => item.budgetItemKey));

  for (const programKey of programsByItem.keys()) {
    if (!itemKeys.has(programKey)) {
      throw new Error(
        `budget_items.csvにないprogramのbudget_item_keyです: ${programKey}`,
      );
    }
  }
  for (const sectionKey of sectionsByItem.keys()) {
    if (!itemKeys.has(sectionKey)) {
      throw new Error(
        `budget_items.csvにないsectionのbudget_item_keyです: ${sectionKey}`,
      );
    }
  }

  return coreItems.map((item) => {
    const itemPrograms = programsByItem.get(item.budgetItemKey) ?? [];
    const itemSections = sectionsByItem.get(item.budgetItemKey) ?? [];
    if (itemPrograms.length !== item.programRowCount) {
      throw new Error(
        `${item.budgetItemKey}のprogram行数がbudget_items.csvと` +
          `一致しません: ${itemPrograms.length} != ${item.programRowCount}`,
      );
    }
    if (itemSections.length !== item.sectionRowCount) {
      throw new Error(
        `${item.budgetItemKey}のsection行数がbudget_items.csvと` +
          `一致しません: ${itemSections.length} != ${item.sectionRowCount}`,
      );
    }

    const programTotal = itemPrograms.reduce(
      (total, program) => total + program.amount_thousand_yen,
      0,
    );
    const sectionTotal = itemSections.reduce(
      (total, section) => total + section.amountThousandYen,
      0,
    );
    if (programTotal !== item.programTotalAmountThousandYen) {
      throw new Error(
        `${item.budgetItemKey}のprogram合計がbudget_items.csvと` +
          `一致しません: ${programTotal} != ` +
          `${item.programTotalAmountThousandYen}`,
      );
    }
    if (sectionTotal !== item.sectionTotalAmountThousandYen) {
      throw new Error(
        `${item.budgetItemKey}のsection合計がbudget_items.csvと` +
          `一致しません: ${sectionTotal} != ` +
          `${item.sectionTotalAmountThousandYen}`,
      );
    }
    if (
      item.validationStatus === "ok" &&
      (programTotal <= 0 || programTotal !== sectionTotal)
    ) {
      throw new Error(`${item.budgetItemKey}のok判定と金額が不整合です。`);
    }
    if (
      item.validationStatus === "ok_zero_amount" &&
      (programTotal !== 0 || sectionTotal !== 0)
    ) {
      throw new Error(
        `${item.budgetItemKey}のok_zero_amount判定と金額が不整合です。`,
      );
    }

    const publicPrograms: PublicBudgetItemProgram[] = itemPrograms.map(
      (program) => ({
        programId: program.program_id,
        majorProgramName: program.major_program_name,
        budgetProgramName: program.budget_program_name,
        detailProgramName: program.detail_program_name,
        departmentDisplayName:
          program.department_display_name.length > 0
            ? program.department_display_name
            : null,
        amountThousandYen: program.amount_thousand_yen,
        isZeroAmount: program.is_zero_amount,
        sourceReference: toOfficialCsvSourceReference(program),
      }),
    );
    const publicSections: PublicBudgetItemSection[] = itemSections.map(
      (section) => ({
        sectionId: section.sectionId,
        setsuCode: section.setsuCode,
        setsuName: section.setsuName,
        amountThousandYen: section.amountThousandYen,
        scope: "budget_item",
        sourceReference: section.sourceReference,
      }),
    );
    const sourceReferences = deduplicateSourceReferences([
      { sourceType: "derived" },
      ...publicPrograms.flatMap((program) =>
        program.sourceReference ? [program.sourceReference] : [],
      ),
      ...publicSections.flatMap((section) =>
        section.sourceReference ? [section.sourceReference] : [],
      ),
    ]);

    return {
      budgetItemKey: item.budgetItemKey,
      fiscalYear: item.fiscalYear,
      accountCode: item.accountCode,
      accountName: item.accountName,
      budgetSide: item.budgetSide,
      kan: {
        code: item.kanCode,
        name: item.kanName,
      },
      kou: {
        code: item.kouCode,
        name: item.kouName,
      },
      moku: {
        code: item.mokuCode,
        name: item.mokuName,
      },
      amountThousandYen: item.programTotalAmountThousandYen,
      validationStatus: item.validationStatus,
      programs: publicPrograms,
      sections: publicSections,
      dataAvailability: { ...DATA_AVAILABILITY },
      sourceReferences,
    };
  });
}

export function buildPublicBudgetReadModel(
  programsCsv: string,
  sectionsCsv: string,
  itemsCsv: string,
): PublicBudgetReadModel {
  const programs = parsePublicBudgetPrograms(programsCsv);
  const sections = parseCoreBudgetSections(sectionsCsv);
  const coreItems = parseCoreBudgetItems(itemsCsv);
  const budgetItems = buildPublicBudgetItems(
    coreItems,
    programs,
    sections,
  );
  return { programs, budgetItems };
}

export function serializePublicBudgetPrograms(
  programs: readonly PublicBudgetProgram[],
): string {
  return stringify(
    programs.map((program) => ({
      ...program,
      is_zero_amount: String(program.is_zero_amount),
      source_row_number: program.source_row_number ?? "",
    })),
    {
      columns: [...PUBLIC_BUDGET_PROGRAM_COLUMNS],
      header: true,
      record_delimiter: "unix",
    },
  );
}

export function serializePublicBudgetItems(
  budgetItems: readonly PublicBudgetItem[],
): string {
  return `${JSON.stringify(budgetItems, null, 2)}\n`;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchPublicBudgetPrograms(
  query: string,
  options: SearchPublicBudgetProgramsOptions,
): PublicBudgetProgram[] {
  const limit = options.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 5_000) {
    throw new Error("limitは1以上5,000以下の整数にしてください。");
  }
  const normalizedTerms = normalizeSearchText(query)
    .split(" ")
    .filter((term) => term.length > 0);

  const results: PublicBudgetProgram[] = [];
  for (const program of options.programs) {
    if (!options.includeZeroAmount && program.is_zero_amount) {
      continue;
    }
    if (
      options.accountCode &&
      program.account_code !== options.accountCode
    ) {
      continue;
    }
    if (
      options.budgetItemKey &&
      program.budget_item_key !== options.budgetItemKey
    ) {
      continue;
    }

    const searchableText = normalizeSearchText(
      [
        program.program_id,
        program.budget_item_key,
        program.account_name,
        program.kan_name,
        program.kou_name,
        program.moku_name,
        program.major_program_name,
        program.budget_program_name,
        program.detail_program_name,
        program.department_display_name,
      ].join(" "),
    );
    if (
      normalizedTerms.length > 0 &&
      !normalizedTerms.every((term) => searchableText.includes(term))
    ) {
      continue;
    }

    results.push(program);
    if (results.length === limit) {
      break;
    }
  }
  return results;
}

export function getPublicBudgetItemDetail(
  budgetItemKey: string,
  budgetItems: readonly PublicBudgetItem[],
): PublicBudgetItem | null {
  const normalizedKey = budgetItemKey.trim();
  if (normalizedKey.length === 0) {
    throw new Error("budgetItemKeyが空です。");
  }
  return (
    budgetItems.find(
      (budgetItem) => budgetItem.budgetItemKey === normalizedKey,
    ) ?? null
  );
}

export function classifyBudgetQuestionAvailability(
  query: string,
): BudgetAiReasonCode | null {
  const normalizedQuery = normalizeSearchText(query);

  if (
    /(国費|国庫|都費|都支出金|一般財源|財源内訳|財源|充当額)/u.test(
      normalizedQuery,
    )
  ) {
    return "FUNDING_DATA_PENDING_REVENUE_PHASE";
  }
  if (
    /((?:この|個別|各)?(?:予算)?事業|事業ごと|事業別).*(節|委託料|工事費|工事請負費)|(?:節|委託料|工事費|工事請負費).*((?:この|個別|各)?(?:予算)?事業|事業ごと|事業別)/u.test(
      normalizedQuery,
    )
  ) {
    return "PROGRAM_SECTION_MAPPING_NOT_AVAILABLE";
  }
  if (
    /(実支出|実際(?:に|の)?.*(?:支出|使)|執行額|支出実績|支払額|(?:いくら|どれだけ).*使(?:った|われた))/u.test(
      normalizedQuery,
    )
  ) {
    return "ACTUAL_SPENDING_NOT_AVAILABLE";
  }
  if (/(決算|不用額|繰越額)/u.test(normalizedQuery)) {
    return "SETTLEMENT_DATA_NOT_AVAILABLE";
  }
  if (
    /(支払先|業者|事業者名|会社名|どこの会社|受託者|契約相手|契約先|委託先|誰に.*(?:支払|委託))/u.test(
      normalizedQuery,
    )
  ) {
    return "VENDOR_DATA_NOT_AVAILABLE";
  }
  if (
    /(契約額|契約金額|契約情報|契約内容|落札|随意契約|契約.*(?:いくら|金額|した|する))/u.test(
      normalizedQuery,
    )
  ) {
    return "CONTRACT_DATA_NOT_AVAILABLE";
  }
  return null;
}

export function buildBudgetAiContext(
  queryResult: BudgetAiQueryResult,
): BudgetAiContextResult {
  const reasonCode = classifyBudgetQuestionAvailability(queryResult.query);
  if (reasonCode) {
    return {
      answerable: false,
      reasonCode,
      message: REASON_MESSAGES[reasonCode],
    };
  }

  return {
    answerable: true,
    context: {
      query: queryResult.query,
      constraints: BUDGET_AI_CONSTRAINTS,
      programs: queryResult.programs,
      budgetItems: queryResult.budgetItems,
    },
  };
}

function createAccountTotals(): Record<string, number> {
  return Object.fromEntries(
    Object.keys(EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN).map(
      (accountCode) => [accountCode, 0],
    ),
  );
}

function addAccountAmount(
  totals: Record<string, number>,
  accountCode: string,
  amount: number,
  sourceName: string,
): void {
  if (!(accountCode in totals)) {
    throw new Error(
      `${sourceName}に未定義のaccount_codeがあります: ${accountCode}`,
    );
  }
  totals[accountCode] += amount;
}

function assertExpectedAccountTotals(
  totals: Record<string, number>,
  sourceName: string,
): void {
  for (const [accountCode, expected] of Object.entries(
    EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
  )) {
    if (totals[accountCode] !== expected) {
      throw new Error(
        `${sourceName}の${accountCode}合計が一致しません: ` +
          `${totals[accountCode]} != ${expected}`,
      );
    }
  }
}

function assertExactObjectKeys(
  value: object,
  expectedKeys: readonly string[],
  fieldName: string,
): void {
  const actualKeys = Object.keys(value);
  if (actualKeys.join(",") !== expectedKeys.join(",")) {
    throw new Error(
      `${fieldName}のキーが公開スキーマと一致しません: ` +
        actualKeys.join(","),
    );
  }
}

function assertSourceReferenceSchema(
  sourceReference: PublicBudgetSourceReference,
  fieldName: string,
): void {
  if (sourceReference.sourceType === "derived") {
    assertExactObjectKeys(sourceReference, ["sourceType"], fieldName);
    return;
  }
  if (sourceReference.sourceType === "official_csv") {
    assertExactObjectKeys(
      sourceReference,
      ["sourceType", "sourceFile", "sourceRowNumber"],
      fieldName,
    );
    return;
  }
  assertExactObjectKeys(
    sourceReference,
    ["sourceType", "sourceFile", "pdfPage", "budgetBookPage"],
    fieldName,
  );
}

export function validatePublicBudgetProgramCsv(csvText: string): void {
  const table = parse(csvText, {
    bom: true,
    columns: false,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (table.length < 2) {
    throw new Error("public_budget_programs.csvにデータ行がありません。");
  }
  const columns = table[0];
  const isBaseSchema =
    columns.join(",") === PUBLIC_BUDGET_PROGRAM_COLUMNS.join(",");
  const isIdentitySchema =
    columns.join(",") ===
    PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY.join(",");
  if (!isBaseSchema && !isIdentitySchema) {
    throw new Error(
      "public_budget_programs.csvの列が公開スキーマと一致しません。",
    );
  }
  if (
    isIdentitySchema &&
    table
      .slice(1)
      .some(
        (row) =>
          (row[PUBLIC_BUDGET_PROGRAM_COLUMNS.length] ?? "").trim()
            .length === 0,
      )
  ) {
    throw new Error(
      "public_budget_programs.csvのbudget_program_identity_idが空です。",
    );
  }
  for (const forbiddenColumn of FORBIDDEN_PUBLIC_BUDGET_COLUMNS) {
    if (columns.includes(forbiddenColumn)) {
      throw new Error(
        `公開禁止列がpublic_budget_programs.csvにあります: ` +
          forbiddenColumn,
      );
    }
  }
}

export function validatePublicBudgetReadModel(
  model: PublicBudgetReadModel,
): PublicBudgetValidation {
  if (model.programs.length !== EXPECTED_PUBLIC_BUDGET_PROGRAM_ROW_COUNT) {
    throw new Error(
      `公開program行数が一致しません: ${model.programs.length} != ` +
        `${EXPECTED_PUBLIC_BUDGET_PROGRAM_ROW_COUNT}`,
    );
  }
  if (
    model.budgetItems.length !== EXPECTED_PUBLIC_BUDGET_ITEM_ROW_COUNT
  ) {
    throw new Error(
      `公開budget item行数が一致しません: ` +
        `${model.budgetItems.length} != ` +
        `${EXPECTED_PUBLIC_BUDGET_ITEM_ROW_COUNT}`,
    );
  }

  const accountProgramTotals = createAccountTotals();
  const accountItemTotals = createAccountTotals();
  const accountSectionTotals = createAccountTotals();
  const programIds = new Set<string>();
  const itemKeys = new Set<string>();
  const sectionIds = new Set<string>();
  const nestedProgramIds = new Set<string>();
  let programTotal = 0;
  let itemTotal = 0;
  let sectionTotal = 0;
  let nestedProgramCount = 0;
  let nestedSectionCount = 0;

  for (const program of model.programs) {
    assertExactObjectKeys(
      program,
      PUBLIC_BUDGET_PROGRAM_COLUMNS,
      `program ${program.program_id}`,
    );
    programIds.add(program.program_id);
    programTotal += program.amount_thousand_yen;
    addAccountAmount(
      accountProgramTotals,
      program.account_code,
      program.amount_thousand_yen,
      "public_budget_programs",
    );
  }

  for (const item of model.budgetItems) {
    assertExactObjectKeys(
      item,
      [
        "budgetItemKey",
        "fiscalYear",
        "accountCode",
        "accountName",
        "budgetSide",
        "kan",
        "kou",
        "moku",
        "amountThousandYen",
        "validationStatus",
        "programs",
        "sections",
        "dataAvailability",
        "sourceReferences",
      ],
      `budget item ${item.budgetItemKey}`,
    );
    assertExactObjectKeys(
      item.kan,
      ["code", "name"],
      `${item.budgetItemKey}.kan`,
    );
    assertExactObjectKeys(
      item.kou,
      ["code", "name"],
      `${item.budgetItemKey}.kou`,
    );
    assertExactObjectKeys(
      item.moku,
      ["code", "name"],
      `${item.budgetItemKey}.moku`,
    );
    assertExactObjectKeys(
      item.dataAvailability,
      [
        "funding",
        "actualSpending",
        "settlement",
        "contracts",
        "vendors",
        "programSectionMapping",
      ],
      `${item.budgetItemKey}.dataAvailability`,
    );
    itemKeys.add(item.budgetItemKey);
    itemTotal += item.amountThousandYen;
    addAccountAmount(
      accountItemTotals,
      item.accountCode,
      item.amountThousandYen,
      "public_budget_items",
    );
    if (
      item.dataAvailability.funding !== "pending_revenue_phase" ||
      item.dataAvailability.actualSpending !== "not_available" ||
      item.dataAvailability.settlement !== "not_available" ||
      item.dataAvailability.contracts !== "not_available" ||
      item.dataAvailability.vendors !== "not_available" ||
      item.dataAvailability.programSectionMapping !== "not_available"
    ) {
      throw new Error(
        `${item.budgetItemKey}のdataAvailabilityが不正です。`,
      );
    }
    if (
      !item.sourceReferences.some(
        (sourceReference) => sourceReference.sourceType === "derived",
      )
    ) {
      throw new Error(
        `${item.budgetItemKey}にderived出典がありません。`,
      );
    }
    for (const [index, sourceReference] of item.sourceReferences.entries()) {
      assertSourceReferenceSchema(
        sourceReference,
        `${item.budgetItemKey}.sourceReferences[${index}]`,
      );
    }

    const itemProgramTotal = item.programs.reduce(
      (total, program) => {
        assertExactObjectKeys(
          program,
          [
            "programId",
            "majorProgramName",
            "budgetProgramName",
            "detailProgramName",
            "departmentDisplayName",
            "amountThousandYen",
            "isZeroAmount",
            "sourceReference",
          ],
          `${item.budgetItemKey}.programs`,
        );
        if ("sections" in program) {
          throw new Error(
            `${item.budgetItemKey}のprogram内にsectionsがあります。`,
          );
        }
        if (program.sourceReference) {
          assertSourceReferenceSchema(
            program.sourceReference,
            `${item.budgetItemKey}.programs.sourceReference`,
          );
        }
        nestedProgramIds.add(program.programId);
        nestedProgramCount += 1;
        return total + program.amountThousandYen;
      },
      0,
    );
    const itemSectionTotal = item.sections.reduce(
      (total, section) => {
        assertExactObjectKeys(
          section,
          [
            "sectionId",
            "setsuCode",
            "setsuName",
            "amountThousandYen",
            "scope",
            "sourceReference",
          ],
          `${item.budgetItemKey}.sections`,
        );
        if (section.scope !== "budget_item") {
          throw new Error(
            `${item.budgetItemKey}のsection scopeがbudget_itemではありません。`,
          );
        }
        if (
          "programId" in section ||
          "program_id" in section ||
          "programSectionId" in section
        ) {
          throw new Error(
            `${item.budgetItemKey}のsectionに事業紐付けIDがあります。`,
          );
        }
        if (section.sourceReference) {
          assertSourceReferenceSchema(
            section.sourceReference,
            `${item.budgetItemKey}.sections.sourceReference`,
          );
        }
        sectionIds.add(section.sectionId);
        nestedSectionCount += 1;
        sectionTotal += section.amountThousandYen;
        addAccountAmount(
          accountSectionTotals,
          item.accountCode,
          section.amountThousandYen,
          "public_budget_items.sections",
        );
        return total + section.amountThousandYen;
      },
      0,
    );

    if (itemProgramTotal !== item.amountThousandYen) {
      throw new Error(
        `${item.budgetItemKey}の事業合計が目予算額と一致しません。`,
      );
    }
    if (
      item.validationStatus === "ok" &&
      itemSectionTotal !== item.amountThousandYen
    ) {
      throw new Error(
        `${item.budgetItemKey}の節合計が目予算額と一致しません。`,
      );
    }
    if (
      item.validationStatus === "ok_zero_amount" &&
      (item.amountThousandYen !== 0 || itemSectionTotal !== 0)
    ) {
      throw new Error(
        `${item.budgetItemKey}の0円項目に金額があります。`,
      );
    }
  }

  if (programIds.size !== model.programs.length) {
    throw new Error("公開program_idが一意ではありません。");
  }
  if (itemKeys.size !== model.budgetItems.length) {
    throw new Error("公開budgetItemKeyが一意ではありません。");
  }
  if (nestedProgramIds.size !== nestedProgramCount) {
    throw new Error("JSON内のprogramIdが一意ではありません。");
  }
  if (nestedProgramIds.size !== programIds.size) {
    throw new Error(
      "公開CSVと公開JSONのprogramId集合が一致しません。",
    );
  }
  for (const programId of programIds) {
    if (!nestedProgramIds.has(programId)) {
      throw new Error(
        `公開JSONにprogramIdがありません: ${programId}`,
      );
    }
  }
  if (nestedSectionCount !== EXPECTED_PUBLIC_BUDGET_SECTION_ROW_COUNT) {
    throw new Error(
      `公開section件数が一致しません: ${nestedSectionCount} != ` +
        `${EXPECTED_PUBLIC_BUDGET_SECTION_ROW_COUNT}`,
    );
  }
  if (sectionIds.size !== nestedSectionCount) {
    throw new Error("公開sectionIdが一意ではありません。");
  }

  assertExpectedAccountTotals(
    accountProgramTotals,
    "public_budget_programs",
  );
  assertExpectedAccountTotals(
    accountItemTotals,
    "public_budget_items",
  );
  assertExpectedAccountTotals(
    accountSectionTotals,
    "public_budget_items.sections",
  );
  if (
    programTotal !== EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN ||
    itemTotal !== EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN ||
    sectionTotal !== EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN
  ) {
    throw new Error(
      "公開予算データの全会計合計が621,033,664千円ではありません。",
    );
  }

  const zeroAmountProgramCount = model.programs.filter(
    (program) => program.is_zero_amount,
  ).length;
  const zeroAmountItemCount = model.budgetItems.filter(
    (item) => item.validationStatus === "ok_zero_amount",
  ).length;
  if (
    zeroAmountProgramCount !== EXPECTED_PUBLIC_ZERO_AMOUNT_PROGRAM_COUNT
  ) {
    throw new Error(
      `公開0円事業数が一致しません: ${zeroAmountProgramCount} != ` +
        `${EXPECTED_PUBLIC_ZERO_AMOUNT_PROGRAM_COUNT}`,
    );
  }
  if (zeroAmountItemCount !== EXPECTED_PUBLIC_ZERO_AMOUNT_ITEM_COUNT) {
    throw new Error(
      `公開0円項目数が一致しません: ${zeroAmountItemCount} != ` +
        `${EXPECTED_PUBLIC_ZERO_AMOUNT_ITEM_COUNT}`,
    );
  }

  return {
    publicProgramRowCount: model.programs.length,
    publicBudgetItemRowCount: model.budgetItems.length,
    nestedProgramRowCount: nestedProgramCount,
    nestedSectionRowCount: nestedSectionCount,
    uniqueProgramIdCount: programIds.size,
    uniqueBudgetItemKeyCount: itemKeys.size,
    uniqueSectionIdCount: sectionIds.size,
    zeroAmountProgramCount,
    zeroAmountItemCount,
    programTotalAmountThousandYen: programTotal,
    itemTotalAmountThousandYen: itemTotal,
    sectionTotalAmountThousandYen: sectionTotal,
    accountProgramTotalsThousandYen: accountProgramTotals,
    accountItemTotalsThousandYen: accountItemTotals,
    accountSectionTotalsThousandYen: accountSectionTotals,
  };
}
