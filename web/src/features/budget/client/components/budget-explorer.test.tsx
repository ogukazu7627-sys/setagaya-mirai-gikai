// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ACTIVE_BUDGET_DATASET } from "../../shared/test-data/education-school-aging-exploration";
import type { BudgetProgramSearchResult } from "../../shared/types/budget";
import type { BudgetExplorationData } from "../../shared/types/budget-exploration";
import { BudgetExplorer } from "./budget-explorer";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  getSearchParam: vi.fn(),
  requestBudgetProgramSearch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    replace: mocks.replace,
  }),
  useSearchParams: () => ({ get: mocks.getSearchParam }),
}));

vi.mock("./budget-map-iframe", () => ({
  BudgetMapIframe: function MockBudgetMapIframe({
    onBack,
    onOpenOfficialHierarchy,
    onSelectCategory,
    onSelectProgram,
    onSelectTopic,
  }: {
    onBack: () => void;
    onOpenOfficialHierarchy: () => void;
    onSelectCategory: (slug: string) => void;
    onSelectProgram: (identityId: string) => void;
    onSelectTopic: (categorySlug: string, topicSlug: string) => void;
  }) {
    return (
      <div>
        <button type="button" onClick={() => onSelectCategory("education")}>
          教育から探す
        </button>
        <button
          type="button"
          onClick={() => onSelectTopic("education", "school-facility-aging")}
        >
          課題から探す
        </button>
        <button type="button" onClick={() => onSelectProgram("bpi_school")}>
          事業を見る
        </button>
        <button type="button" onClick={onBack}>
          戻る
        </button>
        <button type="button" onClick={onOpenOfficialHierarchy}>
          公式分類を見る
        </button>
      </div>
    );
  },
}));

vi.mock("../utils/budget-search-api", () => ({
  requestBudgetProgramSearch: mocks.requestBudgetProgramSearch,
}));

vi.mock("../utils/budget-search-storage", () => ({
  getBrowserBudgetSearchInstallationId: () =>
    "11111111-1111-4111-8111-111111111111",
}));

const exploration: BudgetExplorationData = {
  activeDataset: TEST_ACTIVE_BUDGET_DATASET,
  availability: "available",
  categories: [
    {
      id: "category-education",
      slug: "education",
      name: "教育",
      shortDescription: "教育分野",
      sortOrder: 1,
      tone: "cyan",
      topics: [
        {
          id: "topic-school-aging",
          slug: "school-facility-aging",
          name: "学校施設の老朽化への対応",
          shortDescription: "学校施設を維持・改修する取組",
          topicKind: "problem",
          categorySlugs: ["education"],
          programs: [],
        },
      ],
    },
  ],
};

const schoolSearchItem: BudgetProgramSearchResult["items"][number] = {
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
  score: 116,
  matchedField: "topic_name",
};

function createSearchResult(
  items: BudgetProgramSearchResult["items"] = [schoolSearchItem]
): BudgetProgramSearchResult {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
  };
}

describe("BudgetExplorer", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.refresh.mockReset();
    mocks.replace.mockReset();
    mocks.getSearchParam.mockReset();
    mocks.requestBudgetProgramSearch.mockReset();
    mocks.getSearchParam.mockReturnValue(null);
    window.history.replaceState(null, "", "/budget");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  it("大分類・課題をURL履歴へ積み、再読込可能な状態にする", async () => {
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "教育から探す" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "教育" })
      ).toBeVisible()
    );
    expect(window.location.pathname + window.location.search).toBe(
      "/budget?category=education"
    );
    expect(mocks.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "課題から探す" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "学校施設の老朽化への対応",
        })
      ).toBeVisible()
    );
    expect(window.location.pathname + window.location.search).toBe(
      "/budget?category=education&topic=school-facility-aging"
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("事業タップはローカルグラフを増やさず詳細URLへ遷移する", async () => {
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "事業を見る" }));

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/budget/programs/bpi_school", {
        scroll: true,
      })
    );
  });

  it("教育カテゴリーの公式分類導線を「教育費」に絞り込む", async () => {
    mocks.getSearchParam.mockImplementation((key: string) =>
      key === "category" ? "education" : null
    );
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "公式分類を見る" }));

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/budget/all?account=general&kan=08",
        { scroll: true }
      )
    );
  });

  it("課題グラフから事業詳細へカテゴリーと課題の戻り文脈を渡す", async () => {
    mocks.getSearchParam.mockImplementation((key: string) => {
      if (key === "category") {
        return "education";
      }
      if (key === "topic") {
        return "school-facility-aging";
      }
      return null;
    });
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "事業を見る" }));

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/budget/programs/bpi_school?fromCategory=education&fromTopic=school-facility-aging",
        { scroll: true }
      )
    );
  });

  it("画面内の戻るは履歴へ逆向きの状態を積まずreplaceする", async () => {
    mocks.getSearchParam.mockImplementation((key: string) => {
      if (key === "category") {
        return "education";
      }
      if (key === "topic") {
        return "school-facility-aging";
      }
      return null;
    });
    window.history.replaceState(
      null,
      "",
      "/budget?category=education&topic=school-facility-aging"
    );
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "戻る" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "教育" })
      ).toBeVisible()
    );
    expect(window.location.pathname + window.location.search).toBe(
      "/budget?category=education"
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("ブラウザバックでURLの探索状態を復元する", async () => {
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "教育から探す" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "教育" })
      ).toBeVisible()
    );

    window.history.replaceState(null, "", "/budget");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(
      await screen.findByRole("heading", { level: 1, name: "触れる予算" })
    ).toBeVisible();
  });

  it("検索結果が1件でも一覧を示し、選択するまで詳細へ移動しない", async () => {
    mocks.requestBudgetProgramSearch.mockResolvedValue(createSearchResult());
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.type(
      screen.getByRole("searchbox", { name: "知りたい予算を検索" }),
      "学校施設の老朽化"
    );
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(
      await screen.findByRole("option", { name: /小学校施設改修工事/ })
    ).toBeVisible();
    expect(screen.getByText("教育から探す").closest("[inert]")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(mocks.push).not.toHaveBeenCalled();

    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/budget/programs/bpi_school", {
        scroll: true,
      })
    );
  });

  it("新しい検索を始めたら古い応答を中断し、結果を上書きさせない", async () => {
    let resolveFirst: ((result: BudgetProgramSearchResult) => void) | undefined;
    let firstSignal: AbortSignal | undefined;
    const firstRequest = new Promise<BudgetProgramSearchResult>((resolve) => {
      resolveFirst = resolve;
    });
    mocks.requestBudgetProgramSearch
      .mockImplementationOnce(
        (_input: unknown, signal: AbortSignal | undefined) => {
          firstSignal = signal;
          return firstRequest;
        }
      )
      .mockResolvedValueOnce(createSearchResult([]));
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);
    const searchbox = screen.getByRole("searchbox", {
      name: "知りたい予算を検索",
    });

    await user.type(searchbox, "最初の検索");
    await user.click(screen.getByRole("button", { name: "検索" }));
    await waitFor(() =>
      expect(mocks.requestBudgetProgramSearch).toHaveBeenCalledTimes(1)
    );

    await user.clear(searchbox);
    await user.type(searchbox, "新しい検索");
    expect(firstSignal?.aborted).toBe(true);
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(
      await screen.findByRole("button", { name: "検索条件を変える" })
    ).toBeVisible();

    await act(async () => {
      resolveFirst?.(
        createSearchResult([
          { ...schoolSearchItem, displayProgramName: "古い検索結果" },
        ])
      );
      await firstRequest;
    });

    expect(
      screen.queryByRole("option", { name: /古い検索結果/ })
    ).not.toBeInTheDocument();
  });
});
