// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetExplorationData } from "../../shared/types/budget-exploration";
import { createBudgetMapMessage } from "../../shared/utils/budget-map-message";
import { BudgetExplorer } from "./budget-explorer";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  getSearchParam: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => ({ get: mocks.getSearchParam }),
}));

vi.mock("../utils/budget-search-api", () => ({
  requestBudgetProgramSearch: vi.fn(),
}));

vi.mock("../utils/budget-search-storage", () => ({
  getBrowserBudgetSearchInstallationId: () =>
    "11111111-1111-4111-8111-111111111111",
}));

const exploration: BudgetExplorationData = {
  activeDatasetId: "11111111-1111-4111-8111-111111111111",
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
          programs: [
            {
              budgetProgramIdentityId: "bpi_school",
              displayProgramName: "小学校施設改修工事",
              accountCode: "general",
              accountName: "一般会計",
              kanName: "教育費",
              kouName: "小学校費",
              mokuName: "学校施設費",
              departmentDisplayName: "教育環境課",
              amountThousandYen: 100,
              isZeroAmount: false,
              relationType: "responds_to",
              categorySlugs: ["education"],
            },
          ],
        },
      ],
    },
  ],
};

describe("BudgetExplorer iframe integration", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.getSearchParam.mockImplementation((key: string) => {
      if (key === "category") {
        return "education";
      }
      if (key === "topic") {
        return "school-facility-aging";
      }
      return null;
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  it("実iframeのprogram messageを戻り文脈付き詳細URLへ接続する", async () => {
    render(<BudgetExplorer exploration={exploration} />);
    const iframe = screen.getByTitle(
      "触れる予算の探索マップ"
    ) as HTMLIFrameElement;

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe.contentWindow,
          data: createBudgetMapMessage({
            action: "select-program",
            budgetProgramIdentityId: "bpi_school",
          }),
        })
      );
    });

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/budget/programs/bpi_school?fromCategory=education&fromTopic=school-facility-aging",
        { scroll: true }
      )
    );
  });
});
