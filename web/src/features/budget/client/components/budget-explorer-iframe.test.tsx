// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EDUCATION_SCHOOL_AGING_EXPLORATION,
  TEST_ACTIVE_BUDGET_DATASET,
} from "../../shared/test-data/education-school-aging-exploration";
import { createBudgetMapMessage } from "../../shared/utils/budget-map-message";
import { BudgetExplorer } from "./budget-explorer";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  getSearchParam: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    replace: mocks.replace,
  }),
  useSearchParams: () => ({ get: mocks.getSearchParam }),
}));

vi.mock("../utils/budget-search-api", () => ({
  requestBudgetProgramSearch: vi.fn(),
}));

vi.mock("../utils/budget-search-storage", () => ({
  getBrowserBudgetSearchInstallationId: () =>
    "11111111-1111-4111-8111-111111111111",
}));

const exploration = EDUCATION_SCHOOL_AGING_EXPLORATION;
const selectedProgram = exploration.categories[0]?.topics[0]?.programs[0];

describe("BudgetExplorer iframe integration", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.refresh.mockReset();
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
    window.history.replaceState(
      null,
      "",
      "/budget?category=education&topic=school-facility-aging"
    );
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  it("初回のcategory messageだけでiframeを再読込せず選択状態へ進む", async () => {
    mocks.getSearchParam.mockReturnValue(null);
    window.history.replaceState(null, "", "/budget");
    render(<BudgetExplorer exploration={exploration} />);
    const iframe = screen.getByTitle(
      "触れる予算の探索マップ"
    ) as HTMLIFrameElement;

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe.contentWindow,
          data: createBudgetMapMessage(
            { action: "ready" },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });
    await waitFor(() =>
      expect(iframe.closest("[data-map-loaded]")).toHaveAttribute(
        "data-map-loaded",
        "true"
      )
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe.contentWindow,
          data: createBudgetMapMessage(
            {
              action: "select-category",
              categorySlug: "culture-sports",
            },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "文化・スポーツ",
      })
    ).toBeVisible();
    expect(window.location.pathname + window.location.search).toBe(
      "/budget?category=culture-sports"
    );
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByTitle("触れる予算の探索マップ")).toBe(iframe);
  });

  it("実iframeのprogram messageを戻り文脈付き詳細URLへ接続する", async () => {
    if (!selectedProgram) {
      throw new Error("approved program fixture is missing");
    }
    expect(exploration.categories[0]?.topics[0]?.programs).toHaveLength(13);
    render(<BudgetExplorer exploration={exploration} />);
    const iframe = screen.getByTitle(
      "触れる予算の探索マップ"
    ) as HTMLIFrameElement;

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe.contentWindow,
          data: createBudgetMapMessage(
            { action: "ready" },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });
    expect(iframe.closest("[data-map-loaded]"))?.toHaveAttribute(
      "data-map-loaded",
      "true"
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe.contentWindow,
          data: createBudgetMapMessage(
            {
              action: "select-program",
              budgetProgramIdentityId: selectedProgram.budgetProgramIdentityId,
            },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        `/budget/programs/${selectedProgram.budgetProgramIdentityId}?fromCategory=education&fromTopic=school-facility-aging`,
        { scroll: true }
      )
    );
  });
});
