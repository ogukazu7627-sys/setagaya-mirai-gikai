// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BudgetProgramDirectory } from "../../shared/types/budget";
import { BudgetProgramDirectoryPage } from "./budget-program-directory-page";

const directory: BudgetProgramDirectory = {
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
      kan: { code: "08", name: "教育費" },
      kou: { code: "02", name: "小学校費" },
      moku: { code: "06", name: "学校施設充実費" },
      itemKey: "2026_general_expenditure_08_02_06",
    },
  ],
  items: [
    {
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
          detailProgramName: "普通教室改修",
          departmentDisplayName: "教育委員会事務局 教育環境課",
          amountThousandYen: 4_140_518,
          isZeroAmount: false,
          sourceReference: {},
        },
      ],
    },
  ],
  total: 1_113,
  selection: {
    fiscalYear: 2026,
    accountCode: null,
    kanCode: null,
    kouCode: null,
    mokuCode: null,
    includeZeroAmount: false,
    sort: "amount_desc",
    page: 1,
    pageSize: 24,
  },
};

describe("BudgetProgramDirectoryPage", () => {
  it("未分類を含むidentityから内部事業明細と詳細へ到達できる", async () => {
    const user = userEvent.setup();
    render(<BudgetProgramDirectoryPage directory={directory} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "公式予算分類から歳出を探す",
      })
    ).toBeVisible();
    expect(screen.getByText("1,113件")).toBeVisible();
    expect(
      screen.getByText(
        "課題に未分類の事業も含む、公式データ由来の予算事業です。"
      )
    ).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "予算事業を検索" })
    ).toBeVisible();
    await user.click(screen.getByText("内部の事業明細 1件"));
    expect(screen.getByText("普通教室改修")).toBeVisible();
    expect(screen.getByText(/08 教育費/)).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /小学校施設改修工事|事業の詳細/ })[0]
    ).toHaveAttribute("href", "/budget/programs/bpi_school");
  });

  it("24件ずつのページングで全identityへ到達できる", () => {
    render(
      <BudgetProgramDirectoryPage
        directory={{
          ...directory,
          total: 1_156,
          selection: {
            ...directory.selection,
            includeZeroAmount: true,
          },
        }}
      />
    );

    expect(screen.getByText("1 / 49")).toBeVisible();
    expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute(
      "href",
      "/budget/all?includeZeroAmount=true&page=2"
    );
  });

  it("URL履歴で条件が変わったとき絞り込み表示も同期する", () => {
    const { rerender } = render(
      <BudgetProgramDirectoryPage directory={directory} />
    );

    expect(screen.getByRole("combobox", { name: "会計" })).toHaveValue("");

    rerender(
      <BudgetProgramDirectoryPage
        directory={{
          ...directory,
          selection: {
            ...directory.selection,
            accountCode: "general",
          },
        }}
      />
    );

    expect(screen.getByRole("combobox", { name: "会計" })).toHaveValue(
      "general"
    );
  });

  it("active datasetがない場合は公開待ちの空状態にする", () => {
    render(
      <BudgetProgramDirectoryPage
        directory={{
          ...directory,
          status: "empty",
          activeDataset: null,
          hierarchy: [],
          items: [],
          total: 0,
        }}
      />
    );

    expect(
      screen.getByText("公開中の当初予算データはまだありません")
    ).toBeVisible();
    expect(screen.queryByText("予算事業")).not.toBeInTheDocument();
  });
});
