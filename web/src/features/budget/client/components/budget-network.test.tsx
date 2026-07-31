// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BudgetExplorationCategory,
  BudgetExplorationData,
} from "../../shared/types/budget-exploration";
import { BudgetNetwork } from "./budget-network";

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
  onOpenOfficialHierarchy: vi.fn(),
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

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "ResizeObserver");
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
    const edgeLayer = screen.getByTestId("budget-map-edges");
    expect(edgeLayer.tagName).toBe("svg");
    expect(edgeLayer.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(edgeLayer.querySelectorAll("circle").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".budget-map-star")).toHaveLength(200);
    expect(screen.getAllByRole("button")).toHaveLength(10);
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
      screen.getByRole("button", {
        name: "公式予算分類からすべて見る",
      })
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", {
        name: "公式予算分類からすべて見る",
      })
    );
    expect(callbacks.onOpenOfficialHierarchy).toHaveBeenCalledOnce();
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
      screen.getByRole("button", {
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

  it("category nodeをキーボードで選択できる", async () => {
    const user = userEvent.setup();
    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    await user.tab();
    expect(
      screen.getByRole("button", { name: "教育から予算を探す" })
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(callbacks.onSelectCategory).toHaveBeenCalledWith("education");
  });

  it("idle時はcamera用requestAnimationFrameを開始しない", () => {
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(1);

    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(screen.getByTestId("budget-map-world")).toHaveAttribute(
      "data-camera-moving",
      "false"
    );
  });

  it("reduced-motionではtransitioningでもcamera loopを開始しない", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(1);
    const { rerender } = render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{
          kind: "transitioning",
          current: { kind: "overview" },
          target: { kind: "category", category: education },
        }}
      />
    );

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(screen.getByTestId("budget-map-world")).toHaveStyle({
      willChange: "",
    });
  });

  it("camera遷移完了後はrequestAnimationFrameとwill-changeを解除する", () => {
    const callbacksByFrame = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      callbacksByFrame.set(frameId, callback);
      return frameId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
      callbacksByFrame.delete(frameId);
    });
    const { rerender } = render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{
          kind: "transitioning",
          current: { kind: "overview" },
          target: { kind: "category", category: education },
        }}
      />
    );

    const world = screen.getByTestId("budget-map-world");
    expect(world).toHaveAttribute("data-camera-moving", "true");
    expect(world).toHaveStyle({ willChange: "transform" });

    act(() => {
      const firstFrame = callbacksByFrame.values().next().value;
      if (!firstFrame) {
        throw new Error("first camera frame is missing");
      }
      callbacksByFrame.clear();
      firstFrame(0);

      const finalFrame = callbacksByFrame.values().next().value;
      if (!finalFrame) {
        throw new Error("final camera frame is missing");
      }
      callbacksByFrame.clear();
      finalFrame(250);
    });

    expect(callbacksByFrame).toHaveLength(0);
    expect(world).toHaveAttribute("data-camera-moving", "false");
    expect(world).toHaveStyle({ willChange: "" });
  });

  it("camera遷移中にunmountしてもrequestAnimationFrameを解除する", () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(77);
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");
    const { rerender, unmount } = render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{
          kind: "transitioning",
          current: { kind: "overview" },
          target: { kind: "category", category: education },
        }}
      />
    );
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(77);
  });

  it("ResizeObserverの初回通知だけではcamera遷移を中断しない", () => {
    let resizeCallback: ResizeObserverCallback | null = null;
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe() {}

      disconnect() {}
    }
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: TestResizeObserver,
    });
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    const { rerender } = render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{
          kind: "transitioning",
          current: { kind: "overview" },
          target: { kind: "category", category: education },
        }}
      />
    );
    const world = screen.getByTestId("budget-map-world");
    expect(world).toHaveAttribute("data-camera-moving", "true");

    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
    });

    expect(world).toHaveAttribute("data-camera-moving", "true");
    expect(world).toHaveStyle({ willChange: "transform" });
  });

  it("mobile worldをviewport内でclipし横スクロールを作らない", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    const viewport = screen
      .getByRole("group", {
        name: "予算を10の分野から探すネットワーク",
      })
      .closest("[data-map-mode]");
    expect(viewport).toHaveAttribute("data-map-mode", "mobile");
    expect(viewport).toHaveClass("overflow-hidden");
    expect(document.querySelectorAll(".budget-map-star")).toHaveLength(72);
    expect(screen.getByTestId("budget-map-world")).toHaveStyle({
      width: "360px",
    });
  });
});
