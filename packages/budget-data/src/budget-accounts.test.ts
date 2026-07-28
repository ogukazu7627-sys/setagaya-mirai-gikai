import { describe, expect, it } from "vitest";
import { parseBudgetAccountsConfig } from "./budget-accounts";

const validConfig = {
  fiscal_year: 2026,
  accounts: [
    {
      account_code: "general",
      account_name: "一般会計",
      account_type: "general",
      budget_side: "expenditure",
      csv_account_name: "一般会計",
      expected_amount_thousand_yen: 431_353_010,
      pdf_budget_book_start_page: 310,
      pdf_budget_book_end_page: 479,
      pdf_page_start: 159,
      pdf_page_end: 243,
      status: "active",
    },
    {
      account_code: "school_lunch_fee",
      account_name: "学校給食費会計",
      account_type: "special",
      budget_side: "expenditure",
      csv_account_name: "学校給食費会計",
      expected_amount_thousand_yen: 0,
      pdf_budget_book_start_page: null,
      pdf_budget_book_end_page: null,
      pdf_page_start: null,
      pdf_page_end: null,
      status: "abolished_zero",
    },
  ],
};

describe("parseBudgetAccountsConfig", () => {
  it("active会計と廃止0円会計を読み取る", () => {
    const parsed = parseBudgetAccountsConfig(JSON.stringify(validConfig));

    expect(parsed.fiscal_year).toBe(2026);
    expect(parsed.accounts.map((account) => account.account_code)).toEqual([
      "general",
      "school_lunch_fee",
    ]);
  });

  it("account_codeの重複を拒否する", () => {
    const duplicate = {
      ...validConfig,
      accounts: [
        validConfig.accounts[0],
        {
          ...validConfig.accounts[1],
          account_code: "general",
        },
      ],
    };

    expect(() =>
      parseBudgetAccountsConfig(JSON.stringify(duplicate)),
    ).toThrow("account_codeが重複しています");
  });

  it("廃止0円会計の非ゼロ金額を拒否する", () => {
    const nonZeroAbolished = {
      ...validConfig,
      accounts: [
        validConfig.accounts[0],
        {
          ...validConfig.accounts[1],
          expected_amount_thousand_yen: 1,
        },
      ],
    };

    expect(() =>
      parseBudgetAccountsConfig(JSON.stringify(nonZeroAbolished)),
    ).toThrow("金額0・PDF範囲nullが必要です");
  });

  it("歳入設定を保持し、廃止0円会計を0円として正規化する", () => {
    const withRevenue = {
      ...validConfig,
      accounts: [
        {
          ...validConfig.accounts[0],
          revenue: {
            expected_amount_thousand_yen: 431_353_010,
            pdf_budget_book_start_page: 67,
            pdf_budget_book_end_page: 307,
            pdf_page_start: 37,
            pdf_page_end: 157,
            status: "active",
          },
        },
        {
          ...validConfig.accounts[1],
          revenue: {
            status: "abolished_zero",
          },
        },
      ],
    };

    const parsed = parseBudgetAccountsConfig(JSON.stringify(withRevenue));

    expect(parsed.accounts[0].revenue?.expected_amount_thousand_yen).toBe(
      431_353_010,
    );
    expect(parsed.accounts[1].revenue).toEqual({
      expected_amount_thousand_yen: 0,
      pdf_budget_book_start_page: null,
      pdf_budget_book_end_page: null,
      pdf_page_start: null,
      pdf_page_end: null,
      status: "abolished_zero",
    });
  });
});
