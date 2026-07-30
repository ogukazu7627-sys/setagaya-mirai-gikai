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
      score: 1,
      matchedField: "display_program_name",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

describe("BudgetSearchResults", () => {
  it("検索結果を一覧で表示し、選択した事業だけを詳細遷移へ渡す", async () => {
    const onSelectResult = vi.fn();
    const user = userEvent.setup();
    render(
      <BudgetSearchResults
        query="学校"
        result={result}
        status="success"
        onSelectResult={onSelectResult}
      />
    );

    expect(screen.getByText("「学校」の検索結果")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /小学校施設改修工事/ })
    );
    expect(onSelectResult).toHaveBeenCalledWith(result.items[0]);
  });

  it.each([
    ["loading", "予算事業を探しています"],
    ["error", "検索できませんでした。少し待ってから、もう一度お試しください。"],
  ] as const)("%s状態を明示する", (status, message) => {
    render(
      <BudgetSearchResults
        query="学校"
        result={null}
        status={status}
        onSelectResult={vi.fn()}
      />
    );

    expect(screen.getByText(message)).toBeVisible();
  });

  it("0件を空の一覧として表示する", () => {
    render(
      <BudgetSearchResults
        query="該当なし"
        result={{ ...result, items: [], total: 0 }}
        status="success"
        onSelectResult={vi.fn()}
      />
    );

    expect(
      screen.getByText(/「該当なし」に一致する予算事業は見つかりませんでした/)
    ).toBeVisible();
  });
});
