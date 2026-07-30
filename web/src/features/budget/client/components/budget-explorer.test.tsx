// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetExplorationData } from "../../shared/types/budget-exploration";
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

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockBudgetNetwork({
      onBack,
      onSelectCategory,
      onSelectProgram,
      onSelectTopic,
    }: {
      onBack: () => void;
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
        </div>
      );
    },
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
          programs: [],
        },
      ],
    },
  ],
};

describe("BudgetExplorer", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.getSearchParam.mockReset();
    mocks.getSearchParam.mockReturnValue(null);
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
    const { rerender } = render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "教育から探す" }));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/budget?category=education", {
        scroll: false,
      })
    );

    mocks.push.mockReset();
    mocks.getSearchParam.mockImplementation((key: string) =>
      key === "category" ? "education" : null
    );
    rerender(<BudgetExplorer exploration={exploration} />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "教育" })
      ).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: "課題から探す" }));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/budget?category=education&topic=school-facility-aging",
        { scroll: false }
      )
    );
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
    const user = userEvent.setup();
    render(<BudgetExplorer exploration={exploration} />);

    await user.click(screen.getByRole("button", { name: "戻る" }));

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/budget?category=education", {
        scroll: false,
      })
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
