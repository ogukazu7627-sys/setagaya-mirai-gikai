// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BudgetRevenueDirectory } from "../../shared/types/budget";
import { BudgetRevenueDirectoryPage } from "./budget-revenue-directory-page";

const directory: BudgetRevenueDirectory = {
  status: "ready",
  activeDataset: {
    id: "11111111-1111-4111-8111-111111111111",
    fiscalYear: 2026,
    budgetType: "initial_budget",
    schemaVersion: "public-budget-v1",
    currencyUnit: "thousand_yen",
    manifestSha256: "a".repeat(64),
    validationStatus: "PASS",
  },
  hierarchy: [
    {
      accountCode: "general",
      accountName: "一般会計",
      kan: { code: "13", name: "国庫支出金" },
      kou: { code: "02", name: "国庫補助金" },
      moku: { code: "05", name: "教育費補助金" },
      itemKey: "2026_general_revenue_13_02_05",
    },
  ],
  items: [
    {
      item: {
        revenueItemKey: "2026_general_revenue_13_02_05",
        fiscalYear: 2026,
        accountCode: "general",
        accountName: "一般会計",
        budgetSide: "revenue",
        kan: { code: "13", name: "国庫支出金" },
        kou: { code: "02", name: "国庫補助金" },
        moku: { code: "05", name: "教育費補助金" },
        previousAmountThousandYen: 850_000,
        currentAmountThousandYen: 999_999,
        diffAmountThousandYen: 149_999,
        generalRevenueThousandYen: 279_000,
        specificRevenueThousandYen: 720_999,
        specialAccountRevenueThousandYen: 0,
        validationStatus: "ok",
        isZeroAmount: false,
        revenueSourceDisplay: {},
        dataAvailability: {},
        sourceReferences: [],
      },
      sections: [
        {
          revenueSectionId: "rs_school",
          setsu: { code: "01", name: "小学校費補助金" },
          previousAmountThousandYen: 850_000,
          currentAmountThousandYen: 999_999,
          diffAmountThousandYen: 149_999,
          detailCount: 1,
          validationStatus: "ok",
          sourceReference: {},
        },
      ],
      details: [
        {
          revenueDetailId: "rd_school",
          revenueSectionId: "rs_school",
          setsu: { code: "01", name: "小学校費補助金" },
          saisetsu: { code: "15", name: "学校施設環境改善交付金" },
          departmentDisplayName: "教育委員会事務局 教育環境課",
          sourceFundingCategoryName: "国庫支出金",
          fundingNature: "specific",
          previousAmountThousandYen: 850_000,
          currentAmountThousandYen: 999_999,
          diffAmountThousandYen: 149_999,
          isZeroAmount: false,
          relatedProgramCount: 1,
          sourceReference: {
            source_type: "official_csv",
            source_file: "ippansainyu.csv",
            source_row_number: 101,
          },
        },
      ],
      relatedExpenditurePrograms: [
        {
          budgetProgramIdentityId: "bpi_school",
          budgetItemKey: "2026_general_expenditure_08_02_06",
          accountCode: "general",
          accountName: "一般会計",
          displayProgramName: "小学校施設改修工事",
          departmentDisplayName: "教育委員会事務局 教育環境課",
          amountThousandYen: 4_140_518,
          relationCount: 1,
          revenueDetailIds: ["rd_school"],
          targetResolutionLevels: ["exact_group"],
          sourceReferences: [],
        },
      ],
    },
  ],
  total: 175,
  selection: {
    fiscalYear: 2026,
    accountCode: null,
    kanCode: null,
    kouCode: null,
    mokuCode: null,
    includeZeroAmount: true,
    sort: "amount_desc",
    page: 1,
    pageSize: 10,
  },
};

describe("BudgetRevenueDirectoryPage", () => {
  it("歳入の階層・前年度・当年度・増減・節細節・部署を表示する", async () => {
    const user = userEvent.setup();
    render(<BudgetRevenueDirectoryPage directory={directory} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "歳入を確認する" })
    ).toBeVisible();
    expect(screen.getByText("175件")).toBeVisible();
    expect(screen.getByText(/13 国庫支出金/)).toBeVisible();
    expect(screen.getByText("850,000 千円")).toBeVisible();
    expect(screen.getAllByText("999,999 千円").length).toBeGreaterThan(0);
    expect(screen.getByText("+149,999 千円")).toBeVisible();
    expect(screen.getByText("279,000 千円")).toBeVisible();
    expect(screen.getByText("720,999 千円")).toBeVisible();
    await user.click(screen.getByText("節・細節を確認（節 1件、細節 1件）"));
    expect(screen.getByText(/01 小学校費補助金/)).toBeVisible();
    expect(screen.getByText(/15 学校施設環境改善交付金/)).toBeVisible();
    expect(
      screen.getAllByText("教育委員会事務局 教育環境課").length
    ).toBeGreaterThan(0);
  });

  it("関連歳出を関係として表示し、配分額に見える金額を付けない", () => {
    const { container } = render(
      <BudgetRevenueDirectoryPage directory={directory} />
    );

    expect(
      screen.getByRole("link", { name: /小学校施設改修工事/ })
    ).toHaveAttribute("href", "/budget/programs/bpi_school");
    expect(
      screen.getByText(
        "予算書上の関係を示します。歳入額を各事業へ配分した金額ではありません。"
      )
    ).toBeVisible();
    expect(container).not.toHaveTextContent("4,140,518千円");
    expect(container.querySelector("svg[data-sankey]")).not.toBeInTheDocument();
  });

  it("特別会計は一般財源・特定財源に二分しない", () => {
    const specialItem = directory.items[0];
    if (!specialItem) {
      throw new Error("fixture revenue item is missing");
    }
    render(
      <BudgetRevenueDirectoryPage
        directory={{
          ...directory,
          items: [
            {
              ...specialItem,
              item: {
                ...specialItem.item,
                accountCode: "national_health_insurance",
                accountName: "国民健康保険事業会計",
                generalRevenueThousandYen: 0,
                specificRevenueThousandYen: 0,
                specialAccountRevenueThousandYen: 999_999,
              },
              details: specialItem.details.map((detail) => ({
                ...detail,
                sourceFundingCategoryName: "国民健康保険料",
                fundingNature: "special_account" as const,
              })),
            },
          ],
        }}
      />
    );

    expect(screen.getByText("特別会計の歳入源")).toBeVisible();
    expect(screen.getAllByText("国民健康保険料").length).toBeGreaterThan(0);
    expect(screen.queryByText("一般財源")).not.toBeInTheDocument();
    expect(screen.queryByText("特定財源")).not.toBeInTheDocument();
  });
});
