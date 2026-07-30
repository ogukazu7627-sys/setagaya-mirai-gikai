// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BudgetExplorationCategory,
  BudgetExplorationData,
} from "../../shared/types/budget-exploration";
import { BudgetNetwork } from "./budget-network";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="budget-network-chart">{children}</div>
  ),
  ScatterChart: ({ children }: { children: ReactNode }) => (
    <svg aria-hidden="true">{children}</svg>
  ),
  XAxis: () => null,
  YAxis: () => null,
  ZAxis: () => null,
  ReferenceLine: () => null,
  Scatter: () => null,
}));

const education: BudgetExplorationCategory = {
  id: "category-education",
  slug: "education",
  name: "教育",
  shortDescription: "学校、教育環境、学びの支援",
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
          mokuName: "学校施設充実費",
          departmentDisplayName: "教育委員会事務局 教育環境課",
          amountThousandYen: 4_140_518,
          isZeroAmount: false,
          relationType: "responds_to",
          categorySlugs: ["disaster-prevention", "education"],
        },
      ],
    },
  ],
};

const exploration: BudgetExplorationData = {
  activeDatasetId: "11111111-1111-4111-8111-111111111111",
  availability: "available",
  categories: [
    education,
    ...[
      ["child-rearing", "子育て"],
      ["welfare", "福祉"],
      ["urban-development", "まちづくり"],
      ["disaster-prevention", "防災"],
      ["administration-finance", "行財政"],
      ["culture-sports", "文化・スポーツ"],
      ["industry", "産業"],
      ["environment", "環境問題"],
      ["daily-life", "暮らし"],
    ].map(
      ([slug, name], index): BudgetExplorationCategory => ({
        id: `category-${slug}`,
        slug: slug ?? "",
        name: name ?? "",
        shortDescription: "",
        sortOrder: index + 2,
        tone: "mint",
        topics: [],
      })
    ),
  ],
};

const callbacks = {
  onBack: vi.fn(),
  onFocusSearch: vi.fn(),
  onSelectCategory: vi.fn(),
  onSelectProgram: vi.fn(),
  onSelectTopic: vi.fn(),
};

describe("BudgetNetwork", () => {
  beforeEach(() => {
    for (const callback of Object.values(callbacks)) {
      callback.mockReset();
    }
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("min-width"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("overviewでは10個の大分類だけを入口として表示する", () => {
    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    expect(
      screen.getByRole("group", {
        name: "予算を10の分野から探すネットワーク",
      })
    ).toBeVisible();
    expect(screen.getByTestId("budget-network-chart")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button").map((button) => button.textContent?.trim())
    ).toEqual([
      "教育",
      "子育て",
      "福祉",
      "まちづくり",
      "防災",
      "行財政",
      "文化・スポーツ",
      "産業",
      "環境問題",
      "暮らし",
    ]);
  });

  it("categoryでは公開済みtopicと公式分類導線を表示する", async () => {
    const user = userEvent.setup();
    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "category", category: education }}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: "学校施設の老朽化への対応に関連する予算事業を見る",
      })
    );

    expect(callbacks.onSelectTopic).toHaveBeenCalledWith(
      "education",
      "school-facility-aging"
    );
    expect(
      screen.getByRole("link", {
        name: "公式予算分類からすべて見る",
      })
    ).toHaveAttribute("href", "/budget/official");
  });

  it("topicでは承認済み事業の金額と短縮部署名を表示して詳細へ渡す", async () => {
    const user = userEvent.setup();
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("fixture topic is missing");
    }
    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "topic", category: education, topic }}
      />
    );

    expect(screen.getByText("小学校施設改修工事")).toBeVisible();
    expect(screen.getByText("教育環境課")).toBeVisible();
    expect(screen.getByText("41億4,051万8千円")).toBeVisible();
    expect(screen.getByText("防災")).toBeVisible();
    await user.click(
      screen.getByRole("button", {
        name: /小学校施設改修工事、当初予算額/,
      })
    );
    expect(callbacks.onSelectProgram).toHaveBeenCalledWith("bpi_school");
  });

  it("topicがないcategoryでは整理中・検索・公式分類を示す", async () => {
    const user = userEvent.setup();
    const emptyCategory = exploration.categories[1];
    if (!emptyCategory) {
      throw new Error("fixture category is missing");
    }
    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "category", category: emptyCategory }}
      />
    );

    expect(screen.getByText("この分野は、まだ課題整理中です")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "予算を検索" }));
    expect(callbacks.onFocusSearch).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("link", {
        name: "公式予算分類からすべて見る",
      })
    ).toBeVisible();
  });

  it("取得障害を課題整理中とは表示しない", () => {
    const unavailableExploration: BudgetExplorationData = {
      ...exploration,
      availability: "temporarily_unavailable",
    };
    const emptyCategory = unavailableExploration.categories[1];
    if (!emptyCategory) {
      throw new Error("fixture category is missing");
    }

    render(
      <BudgetNetwork
        {...callbacks}
        exploration={unavailableExploration}
        view={{ kind: "category", category: emptyCategory }}
      />
    );

    expect(screen.getByText("課題データを現在取得できません")).toBeVisible();
    expect(
      screen.queryByText("この分野は、まだ課題整理中です")
    ).not.toBeInTheDocument();
  });
});
