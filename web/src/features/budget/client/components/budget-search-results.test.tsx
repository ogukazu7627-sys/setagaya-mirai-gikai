// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BudgetProgramSearchResult } from "../../shared/types/budget";
import { BudgetSearchResults } from "./budget-search-results";

const result: BudgetProgramSearchResult = {
  items: [
    {
      datasetId: "11111111-1111-4111-8111-111111111111",
      budgetProgramIdentityId: "bpi_school",
      fiscalYear: 2026,
      accountCode: "general",
      accountName: "一般会計",
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
      publishedTopics: [
        {
          slug: "school-facility-aging",
          name: "学校施設の老朽化への対応",
        },
      ],
      score: 1,
      matchedField: "display_program_name",
    },
    {
      datasetId: "11111111-1111-4111-8111-111111111111",
      budgetProgramIdentityId: "bpi_school_design",
      fiscalYear: 2026,
      accountCode: "general",
      accountName: "一般会計",
      budgetItemKey: "2026_general_expenditure_08_02_06",
      kan: { code: "08", name: "教育費" },
      kou: { code: "02", name: "小学校費" },
      moku: { code: "06", name: "学校施設充実費" },
      displayProgramName: "小学校改築設計",
      departmentDisplayName: "教育委員会事務局 教育環境課",
      amountThousandYen: 200_000,
      memberGroupCount: 1,
      memberProgramCount: 1,
      relatedRevenueCount: 0,
      hasPublicIdentityResolution: false,
      isZeroAmount: false,
      publishedTopics: [],
      score: 0.9,
      matchedField: "budget_program_name",
    },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
};

const defaultProps = {
  query: "学校",
  result,
  status: "results" as const,
  onClose: vi.fn(),
  onPageChange: vi.fn(),
  onRetry: vi.fn(),
  onSelectResult: vi.fn(),
};

describe("BudgetSearchResults", () => {
  it("候補を読みやすい一覧で表示し、会計・階層・部署・公開課題を示す", async () => {
    const onSelectResult = vi.fn();
    const user = userEvent.setup();
    render(
      <BudgetSearchResults {...defaultProps} onSelectResult={onSelectResult} />
    );

    expect(screen.getByText("2件")).toBeVisible();
    expect(screen.getAllByText("一般会計")).toHaveLength(2);
    expect(
      screen.getAllByText("教育費 > 小学校費 > 学校施設充実費")
    ).toHaveLength(2);
    expect(screen.getByText("学校施設の老朽化への対応")).toBeVisible();
    await user.click(
      screen.getByRole("option", { name: /小学校施設改修工事/ })
    );
    expect(onSelectResult).toHaveBeenCalledWith(result.items[0]);
  });

  it("上下キーで候補を移動し、Enterで選択する", async () => {
    const onSelectResult = vi.fn();
    const user = userEvent.setup();
    render(
      <BudgetSearchResults {...defaultProps} onSelectResult={onSelectResult} />
    );

    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("option", { name: /小学校施設改修工事/ })
    ).toHaveFocus();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelectResult).toHaveBeenCalledWith(result.items[1]);
  });

  it("総件数が1ページを超える場合に前後のページへ移動できる", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <BudgetSearchResults
        {...defaultProps}
        result={{ ...result, total: 42, page: 2 }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText("2 / 3")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "前へ" }));
    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it("Escapeで候補一覧を閉じる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<BudgetSearchResults {...defaultProps} onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["searching", "予算の宇宙を移動しています"],
    ["error", "検索できませんでした"],
  ] as const)("%s状態を明示する", (status, message) => {
    render(
      <BudgetSearchResults {...defaultProps} result={null} status={status} />
    );

    expect(screen.getByText(message)).toBeVisible();
  });

  it("0件を空の候補一覧として通知する", () => {
    render(
      <BudgetSearchResults
        {...defaultProps}
        result={{ ...result, items: [], total: 0 }}
        status="empty"
      />
    );

    expect(
      screen.getByRole("heading", {
        name: /「学校」/,
      })
    ).toBeVisible();
    expect(
      screen.getAllByText("一致する予算事業は見つかりませんでした")
    ).toHaveLength(2);
  });
});
