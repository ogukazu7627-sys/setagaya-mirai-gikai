// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type {
  BudgetDirectoryHierarchyEntry,
  BudgetDirectorySelection,
} from "../../shared/types/budget";
import { BudgetDirectoryFilters } from "./budget-directory-filters";

const hierarchy: BudgetDirectoryHierarchyEntry[] = [
  {
    accountCode: "general",
    accountName: "一般会計",
    kan: { code: "08", name: "教育費" },
    kou: { code: "02", name: "小学校費" },
    moku: { code: "06", name: "学校施設充実費" },
    itemKey: "2026_general_expenditure_08_02_06",
  },
  {
    accountCode: "national_health_insurance",
    accountName: "国民健康保険事業会計",
    kan: { code: "21", name: "総務費" },
    kou: { code: "01", name: "総務管理費" },
    moku: { code: "01", name: "一般管理費" },
    itemKey: "2026_national_health_insurance_expenditure_21_01_01",
  },
];

const selection: BudgetDirectorySelection = {
  fiscalYear: 2026,
  accountCode: null,
  kanCode: null,
  kouCode: null,
  mokuCode: null,
  includeZeroAmount: false,
  sort: "amount_desc",
  page: 1,
  pageSize: 24,
};

describe("BudgetDirectoryFilters", () => {
  it("会計から目まで段階的に絞り込み、親条件の変更時に子条件をリセットする", async () => {
    const user = userEvent.setup();
    render(
      <BudgetDirectoryFilters
        hierarchy={hierarchy}
        kind="expenditure"
        selection={selection}
      />
    );

    const account = screen.getByLabelText("会計");
    const kan = screen.getByLabelText("款");
    const kou = screen.getByLabelText("項");
    const moku = screen.getByLabelText("目");
    expect(kan).toBeDisabled();
    expect(kou).toBeDisabled();
    expect(moku).toBeDisabled();

    await user.selectOptions(account, "general");
    expect(kan).toBeEnabled();
    await user.selectOptions(kan, "08");
    await user.selectOptions(kou, "02");
    await user.selectOptions(moku, "06");
    expect(moku).toHaveValue("06");

    await user.selectOptions(account, "national_health_insurance");
    expect(kan).toHaveValue("");
    expect(kou).toHaveValue("");
    expect(moku).toHaveValue("");
  });

  it("0円表示と並び順をGETフォームの公開URLへ送る", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BudgetDirectoryFilters
        hierarchy={hierarchy}
        kind="revenue"
        selection={selection}
      />
    );

    await user.click(screen.getByLabelText("0円の項目も表示"));
    await user.selectOptions(screen.getByLabelText("並び順"), "name_asc");

    const form = container.querySelector("form");
    expect(form).toHaveAttribute("action", "/budget/revenue");
    expect(screen.getByLabelText("0円の項目も表示")).toBeChecked();
    expect(screen.getByLabelText("並び順")).toHaveValue("name_asc");
  });
});
