// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetProgramSearchResult } from "../../shared/types/budget";
import { BudgetDirectorySearch } from "./budget-directory-search";

const mocks = vi.hoisted(() => ({
  requestBudgetProgramSearch: vi.fn(),
  getBrowserBudgetSearchInstallationId: vi.fn(),
}));

vi.mock("../utils/budget-search-api", () => ({
  requestBudgetProgramSearch: mocks.requestBudgetProgramSearch,
}));

vi.mock("../utils/budget-search-storage", () => ({
  getBrowserBudgetSearchInstallationId:
    mocks.getBrowserBudgetSearchInstallationId,
}));

const searchResult: BudgetProgramSearchResult = {
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
      publishedTopics: [{ slug: "school-aging", name: "学校施設の老朽化" }],
      score: 100,
      matchedField: "display_program_name",
    },
  ],
  total: 21,
  page: 1,
  pageSize: 20,
};

describe("BudgetDirectorySearch", () => {
  beforeEach(() => {
    mocks.requestBudgetProgramSearch.mockReset();
    mocks.getBrowserBudgetSearchInstallationId.mockReset();
    mocks.getBrowserBudgetSearchInstallationId.mockReturnValue(
      "22222222-2222-4222-8222-222222222222"
    );
    mocks.requestBudgetProgramSearch.mockResolvedValue(searchResult);
  });

  it("検索語をURLに残さず既存APIで予算事業を検索する", async () => {
    const user = userEvent.setup();
    const initialUrl = window.location.href;
    render(
      <BudgetDirectorySearch
        accountCode="general"
        fiscalYear={2026}
        includeZeroAmount={false}
      />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "予算事業を検索" }),
      "  学校   改修  "
    );
    await user.click(screen.getByRole("button", { name: "検索" }));

    await waitFor(() =>
      expect(mocks.requestBudgetProgramSearch).toHaveBeenCalledWith(
        {
          installationId: "22222222-2222-4222-8222-222222222222",
          query: "学校 改修",
          fiscalYear: 2026,
          accountCode: "general",
          includeZeroAmount: false,
          page: 1,
        },
        expect.any(AbortSignal)
      )
    );
    expect(
      await screen.findByRole("link", { name: /小学校施設改修工事/ })
    ).toHaveAttribute("href", "/budget/programs/bpi_school");
    expect(screen.getByText("21件")).toBeVisible();
    expect(window.location.href).toBe(initialUrl);
  });

  it("検索結果を20件ずつページ切り替えできる", async () => {
    const user = userEvent.setup();
    mocks.requestBudgetProgramSearch
      .mockResolvedValueOnce(searchResult)
      .mockResolvedValueOnce({ ...searchResult, page: 2 });
    render(
      <BudgetDirectorySearch
        accountCode={null}
        fiscalYear={2026}
        includeZeroAmount
      />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "予算事業を検索" }),
      "学校"
    );
    await user.click(screen.getByRole("button", { name: "検索" }));
    await screen.findByText("1 / 2");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await waitFor(() =>
      expect(mocks.requestBudgetProgramSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: "学校",
          accountCode: null,
          includeZeroAmount: true,
          page: 2,
        }),
        expect.any(AbortSignal)
      )
    );
    expect(await screen.findByText("2 / 2")).toBeVisible();
  });
});
