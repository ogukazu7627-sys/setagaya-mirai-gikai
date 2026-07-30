// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BudgetProgramDetail } from "../../shared/types/budget";
import { BudgetProgramDetailPage } from "./budget-program-detail-page";

const detail: BudgetProgramDetail = {
  activeDataset: {
    id: "11111111-1111-4111-8111-111111111111",
    fiscalYear: 2026,
    budgetType: "initial_budget",
    schemaVersion: "public-budget-v1",
    currencyUnit: "thousand_yen",
    manifestSha256: "a".repeat(64),
  },
  identity: {
    budgetProgramIdentityId: "bpi_school",
    fiscalYear: 2026,
    accountCode: "general",
    accountName: "一般会計",
    budgetSide: "expenditure",
    budgetItemKey: "2026_general_expenditure_08_02_06",
    kan: { code: "08", name: "教育費" },
    kou: { code: "02", name: "小学校費" },
    moku: { code: "06", name: "学校施設充実費" },
    displayProgramName: "小学校施設改修工事",
    departmentDisplayName: "教育委員会事務局 教育環境課",
    amountThousandYen: 4_140_518,
    memberGroupCount: 1,
    memberProgramCount: 1,
    relatedRevenueCount: 1,
    hasPublicIdentityResolution: false,
    isZeroAmount: false,
    sourceType: "derived_public",
  },
  memberPrograms: [
    {
      programId: "program-school",
      majorProgramName: "校舎校庭等施設整備・充実費",
      budgetProgramName: "小学校施設改修工事",
      detailProgramName: "小学校施設改修工事",
      departmentDisplayName: "教育委員会事務局 教育環境課",
      amountThousandYen: 4_140_518,
      isZeroAmount: false,
      sourceReference: {
        source_type: "official_csv",
        source_file: "ippansaisyutu.csv",
        source_row_number: 10118,
      },
    },
  ],
  budgetItem: {
    budgetItemKey: "2026_general_expenditure_08_02_06",
    fiscalYear: 2026,
    accountCode: "general",
    accountName: "一般会計",
    budgetSide: "expenditure",
    kan: { code: "08", name: "教育費" },
    kou: { code: "02", name: "小学校費" },
    moku: { code: "06", name: "学校施設充実費" },
    amountThousandYen: 4_428_354,
    validationStatus: "ok",
    isZeroAmount: false,
    dataAvailability: {},
    sourceReferences: [],
  },
  otherPrograms: [
    {
      budgetProgramIdentityId: "bpi_school_admin",
      displayProgramName: "小学校施設改修事務",
      departmentDisplayName: "教育委員会事務局 教育環境課",
      amountThousandYen: 57_001,
      isZeroAmount: false,
    },
  ],
  sections: [
    {
      sectionId: "section-15",
      setsuCode: "15",
      setsuName: "工事請負費",
      amountThousandYen: 4_000_000,
      scope: "budget_item",
      sourceReference: {
        source_type: "official_pdf",
        source_file: "r8tousyoyosanallpage.pdf",
        pdf_page: 200,
      },
    },
  ],
  relatedRevenueDetails: [
    {
      allocationLinkId: "allocation-1",
      targetResolutionLevel: "exact_group",
      relationType: "allocated_to_program",
      amountAttributionStatus: "not_available",
      revenueDetailId: "revenue-1",
      revenueItemKey: "2026_general_revenue_13_02_05",
      accountCode: "general",
      accountName: "一般会計",
      kan: { code: "13", name: "国庫支出金" },
      kou: { code: "02", name: "国庫補助金" },
      moku: { code: "05", name: "教育費補助金" },
      setsu: { code: "22", name: "学校施設環境改善交付金" },
      saisetsu: { code: "15", name: "小学校改修" },
      departmentDisplayName: "教育委員会事務局 教育環境課",
      sourceFundingCategoryName: "国庫支出金",
      fundingNature: "specific",
      currentAmountThousandYen: 999_999,
      sourceReference: {},
      allocationSourceReference: {},
    },
  ],
  sourceReferences: [
    {
      source_type: "official_csv",
      source_file: "ippansaisyutu.csv",
      source_row_number: 10118,
    },
  ],
};

describe("BudgetProgramDetailPage", () => {
  it("事業額と目全体の節を区別し、歳入の配分額を表示しない", () => {
    render(<BudgetProgramDetailPage detail={detail} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "小学校施設改修工事" })
    ).toBeVisible();
    expect(screen.getAllByText("41億4,051万8千円")).not.toHaveLength(0);
    expect(
      screen.getByText(
        "節はこの事業単独ではなく、同じ「目」全体の内訳です。個別事業への配分は示していません。"
      )
    ).toBeVisible();
    expect(
      screen.getByText("学校施設環境改善交付金・小学校改修")
    ).toBeVisible();
    expect(screen.queryByText("999,999 千円")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /小学校施設改修事務/ })
    ).toHaveAttribute("href", "/budget/programs/bpi_school_admin");
  });
});
