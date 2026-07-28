export type BudgetAccountStatus = "active" | "abolished_zero";
export type BudgetAccountType = "general" | "special";

export interface BudgetRevenueAccountDefinition {
  expected_amount_thousand_yen: number;
  pdf_budget_book_start_page: number | null;
  pdf_budget_book_end_page: number | null;
  pdf_page_start: number | null;
  pdf_page_end: number | null;
  status: BudgetAccountStatus;
}

export interface BudgetAccountDefinition {
  account_code: string;
  account_name: string;
  account_type: BudgetAccountType;
  budget_side: "expenditure";
  csv_account_name: string;
  expected_amount_thousand_yen: number;
  pdf_budget_book_start_page: number | null;
  pdf_budget_book_end_page: number | null;
  pdf_page_start: number | null;
  pdf_page_end: number | null;
  status: BudgetAccountStatus;
  revenue?: BudgetRevenueAccountDefinition;
}

export interface BudgetAccountsConfig {
  fiscal_year: number;
  accounts: BudgetAccountDefinition[];
}

function assertNonEmptyString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName}が空または文字列ではありません。`);
  }
}

function assertNullablePositiveInteger(
  value: unknown,
  fieldName: string,
): asserts value is number | null {
  if (
    value !== null &&
    (!Number.isSafeInteger(value) || (value as number) <= 0)
  ) {
    throw new Error(`${fieldName}が正の整数またはnullではありません。`);
  }
}

function parseRevenueAccount(
  value: unknown,
  prefix: string,
): BudgetRevenueAccountDefinition | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${prefix}.revenueがオブジェクトではありません。`);
  }
  const row = value as Record<string, unknown>;
  if (row.status !== "active" && row.status !== "abolished_zero") {
    throw new Error(`${prefix}.revenue.statusが不正です。`);
  }

  if (row.status === "abolished_zero") {
    if (
      row.expected_amount_thousand_yen !== undefined &&
      row.expected_amount_thousand_yen !== 0
    ) {
      throw new Error(
        `${prefix}.revenueのabolished_zero会計は金額0が必要です。`,
      );
    }
    return {
      expected_amount_thousand_yen: 0,
      pdf_budget_book_start_page: null,
      pdf_budget_book_end_page: null,
      pdf_page_start: null,
      pdf_page_end: null,
      status: "abolished_zero",
    };
  }

  if (
    !Number.isSafeInteger(row.expected_amount_thousand_yen) ||
    (row.expected_amount_thousand_yen as number) < 0
  ) {
    throw new Error(
      `${prefix}.revenue.expected_amount_thousand_yenが不正です。`,
    );
  }
  assertNullablePositiveInteger(
    row.pdf_budget_book_start_page,
    `${prefix}.revenue.pdf_budget_book_start_page`,
  );
  assertNullablePositiveInteger(
    row.pdf_budget_book_end_page,
    `${prefix}.revenue.pdf_budget_book_end_page`,
  );
  assertNullablePositiveInteger(
    row.pdf_page_start,
    `${prefix}.revenue.pdf_page_start`,
  );
  assertNullablePositiveInteger(
    row.pdf_page_end,
    `${prefix}.revenue.pdf_page_end`,
  );
  const pageValues = [
    row.pdf_budget_book_start_page,
    row.pdf_budget_book_end_page,
    row.pdf_page_start,
    row.pdf_page_end,
  ];
  if (pageValues.some((page) => page === null || page === undefined)) {
    throw new Error(`${prefix}.revenueのactive会計にPDF範囲の空欄があります。`);
  }
  if (
    (row.pdf_budget_book_start_page as number) >
      (row.pdf_budget_book_end_page as number) ||
    (row.pdf_page_start as number) > (row.pdf_page_end as number)
  ) {
    throw new Error(`${prefix}.revenueのPDFページ範囲が逆転しています。`);
  }

  return {
    expected_amount_thousand_yen:
      row.expected_amount_thousand_yen as number,
    pdf_budget_book_start_page:
      row.pdf_budget_book_start_page as number,
    pdf_budget_book_end_page: row.pdf_budget_book_end_page as number,
    pdf_page_start: row.pdf_page_start as number,
    pdf_page_end: row.pdf_page_end as number,
    status: "active",
  };
}

function parseAccount(
  value: unknown,
  index: number,
): BudgetAccountDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`accounts[${index}]がオブジェクトではありません。`);
  }
  const row = value as Record<string, unknown>;
  const prefix = `accounts[${index}]`;

  assertNonEmptyString(row.account_code, `${prefix}.account_code`);
  if (!/^[a-z][a-z0-9_]*$/.test(row.account_code)) {
    throw new Error(
      `${prefix}.account_codeがsnake_case形式ではありません: ` +
        row.account_code,
    );
  }
  assertNonEmptyString(row.account_name, `${prefix}.account_name`);
  assertNonEmptyString(
    row.csv_account_name,
    `${prefix}.csv_account_name`,
  );
  if (row.account_type !== "general" && row.account_type !== "special") {
    throw new Error(`${prefix}.account_typeが不正です。`);
  }
  if (row.budget_side !== "expenditure") {
    throw new Error(`${prefix}.budget_sideがexpenditureではありません。`);
  }
  if (
    !Number.isSafeInteger(row.expected_amount_thousand_yen) ||
    (row.expected_amount_thousand_yen as number) < 0
  ) {
    throw new Error(`${prefix}.expected_amount_thousand_yenが不正です。`);
  }
  if (row.status !== "active" && row.status !== "abolished_zero") {
    throw new Error(`${prefix}.statusが不正です。`);
  }

  assertNullablePositiveInteger(
    row.pdf_budget_book_start_page,
    `${prefix}.pdf_budget_book_start_page`,
  );
  assertNullablePositiveInteger(
    row.pdf_budget_book_end_page,
    `${prefix}.pdf_budget_book_end_page`,
  );
  assertNullablePositiveInteger(
    row.pdf_page_start,
    `${prefix}.pdf_page_start`,
  );
  assertNullablePositiveInteger(
    row.pdf_page_end,
    `${prefix}.pdf_page_end`,
  );

  const pageValues = [
    row.pdf_budget_book_start_page,
    row.pdf_budget_book_end_page,
    row.pdf_page_start,
    row.pdf_page_end,
  ];
  if (row.status === "active") {
    if (pageValues.some((page) => page === null)) {
      throw new Error(`${prefix}のactive会計にPDF範囲のnullがあります。`);
    }
    if (
      (row.pdf_budget_book_start_page as number) >
        (row.pdf_budget_book_end_page as number) ||
      (row.pdf_page_start as number) > (row.pdf_page_end as number)
    ) {
      throw new Error(`${prefix}のPDFページ範囲が逆転しています。`);
    }
  } else if (
    row.expected_amount_thousand_yen !== 0 ||
    pageValues.some((page) => page !== null)
  ) {
    throw new Error(
      `${prefix}のabolished_zero会計は金額0・PDF範囲nullが必要です。`,
    );
  }

  return {
    account_code: row.account_code,
    account_name: row.account_name.trim(),
    account_type: row.account_type,
    budget_side: row.budget_side,
    csv_account_name: row.csv_account_name.trim(),
    expected_amount_thousand_yen:
      row.expected_amount_thousand_yen as number,
    pdf_budget_book_start_page:
      row.pdf_budget_book_start_page as number | null,
    pdf_budget_book_end_page:
      row.pdf_budget_book_end_page as number | null,
    pdf_page_start: row.pdf_page_start as number | null,
    pdf_page_end: row.pdf_page_end as number | null,
    status: row.status,
    revenue: parseRevenueAccount(row.revenue, prefix),
  };
}

export function parseBudgetAccountsConfig(
  jsonText: string,
): BudgetAccountsConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("budget-accounts.jsonが有効なJSONではありません。");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("budget-accounts.jsonのルートがオブジェクトではありません。");
  }

  const root = parsed as Record<string, unknown>;
  if (!Number.isSafeInteger(root.fiscal_year)) {
    throw new Error("fiscal_yearが整数ではありません。");
  }
  if (!Array.isArray(root.accounts) || root.accounts.length === 0) {
    throw new Error("accountsが空または配列ではありません。");
  }

  const accounts = root.accounts.map(parseAccount);
  const accountCodes = new Set(
    accounts.map((account) => account.account_code),
  );
  if (accountCodes.size !== accounts.length) {
    throw new Error("account_codeが重複しています。");
  }
  const csvAccountNames = new Set(
    accounts.map((account) => account.csv_account_name),
  );
  if (csvAccountNames.size !== accounts.length) {
    throw new Error("csv_account_nameが重複しています。");
  }

  return {
    fiscal_year: root.fiscal_year as number,
    accounts,
  };
}
