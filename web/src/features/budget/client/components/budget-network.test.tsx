// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ACTIVE_BUDGET_DATASET } from "../../shared/test-data/education-school-aging-exploration";
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
  activeDataset: TEST_ACTIVE_BUDGET_DATASET,
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
    expect(
      screen.getByRole("img", {
        name: "令和8年度当初予算、世田谷区の予算",
      })
    ).toBeVisible();
    expect(
      screen.getByText(
        "線は画面上の配置を示す装飾です。公式分類やお金の流れ、優先順位を示しません。"
      )
    ).toBeVisible();
    expect(screen.queryByText(/621,033,664/)).not.toBeInTheDocument();
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

    const categoryCore = screen.getByRole("img", {
      name: "選択中の分野、教育、令和8年度当初予算",
    });
    expect(categoryCore).toHaveTextContent("教育");
    expect(categoryCore).toHaveTextContent("令和8年度当初予算");
    expect(categoryCore).not.toHaveTextContent("公開中のテーマ");

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
        name: "公式予算分類「教育費」を見る",
      })
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "防災へ切り替える" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/関連する予算事業\s*\d+件/)
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "公式予算分類「教育費」を見る",
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
    expect(
      screen.queryByText(/関連する予算事業\s*\d+件/)
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "公式予算分類「教育費」を見る",
      })
    );
    expect(callbacks.onOpenOfficialHierarchy).toHaveBeenCalledOnce();
    await user.click(
      screen.getByRole("button", {
        name: /小学校施設改修工事、当初予算額/,
      })
    );
    expect(callbacks.onSelectProgram).toHaveBeenCalledWith("bpi_school");
  });

  it("長い日本語名称と0円事業を削らず文字情報で示す", () => {
    const baseTopic = education.topics[0];
    const baseProgram = baseTopic?.programs[0];
    if (!baseTopic || !baseProgram) {
      throw new Error("fixture program is missing");
    }
    const longName =
      "学校施設の長寿命化および避難所機能向上に向けた総合的な改修事業";
    const topic = {
      ...baseTopic,
      programs: [
        {
          ...baseProgram,
          budgetProgramIdentityId: "bpi_zero",
          displayProgramName: longName,
          amountThousandYen: 0,
          isZeroAmount: true,
        },
      ],
    };

    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "topic", category: education, topic }}
      />
    );

    expect(screen.getByText(longName)).toBeVisible();
    expect(screen.getByText("0円")).toBeVisible();
    expect(
      screen.getByRole("button", { name: new RegExp(longName) })
    ).toHaveAttribute("data-zero-amount", "true");
  });

  it("topicの初期ページを10事業に抑え、残りを次ページで表示する", async () => {
    const user = userEvent.setup();
    const baseTopic = education.topics[0];
    const baseProgram = baseTopic?.programs[0];
    if (!baseTopic || !baseProgram) {
      throw new Error("fixture program is missing");
    }
    const topic = {
      ...baseTopic,
      programs: Array.from({ length: 13 }, (_, index) => ({
        ...baseProgram,
        budgetProgramIdentityId: `bpi_school_${index + 1}`,
        displayProgramName: `学校施設改修事業${index + 1}`,
        amountThousandYen: (index + 1) * 1000,
      })),
    };

    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "topic", category: education, topic }}
      />
    );

    expect(
      screen.getAllByRole("button", { name: /当初予算額.*概要を見る/ })
    ).toHaveLength(10);
    expect(screen.getByText("1 / 2 ページ")).toBeVisible();
    expect(screen.queryByText("学校施設改修事業11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次のページ" }));

    expect(
      screen.getAllByRole("button", { name: /当初予算額.*概要を見る/ })
    ).toHaveLength(3);
    expect(screen.getByText("2 / 2 ページ")).toBeVisible();
    expect(screen.getByText("学校施設改修事業11")).toBeVisible();
    expect(screen.queryByText("学校施設改修事業1")).not.toBeInTheDocument();
  });

  it("mobileのtopicは1ページ6事業に抑える", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    const baseTopic = education.topics[0];
    const baseProgram = baseTopic?.programs[0];
    if (!baseTopic || !baseProgram) {
      throw new Error("fixture program is missing");
    }
    const topic = {
      ...baseTopic,
      programs: Array.from({ length: 13 }, (_, index) => ({
        ...baseProgram,
        budgetProgramIdentityId: `bpi_mobile_${index + 1}`,
        displayProgramName: `モバイル学校施設改修事業${index + 1}`,
      })),
    };

    render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "topic", category: education, topic }}
      />
    );

    expect(
      screen.getAllByRole("button", { name: /当初予算額.*概要を見る/ })
    ).toHaveLength(6);
    expect(screen.getByText("1 / 3 ページ")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "次のページ" }));
    expect(
      screen.getAllByRole("button", { name: /当初予算額.*概要を見る/ })
    ).toHaveLength(6);
    expect(screen.getByText("2 / 3 ページ")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "次のページ" }));
    expect(
      screen.getAllByRole("button", { name: /当初予算額.*概要を見る/ })
    ).toHaveLength(1);
    expect(screen.getByText("3 / 3 ページ")).toBeVisible();
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

    expect(screen.getByText("この分野は、まだテーマ整理中です")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "予算を検索" }));
    expect(callbacks.onFocusSearch).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", {
        name: "公式予算分類「民生費」を見る",
      })
    ).toBeVisible();
  });

  it("取得障害をテーマ整理中とは表示しない", () => {
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

    expect(screen.getByText("テーマデータを現在取得できません")).toBeVisible();
    expect(
      screen.queryByText("この分野は、まだテーマ整理中です")
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

  it("camera遷移完了後は24frame以内でrequestAnimationFrameとwill-changeを解除する", () => {
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

    let frameCount = 0;
    let timestamp = 0;
    act(() => {
      while (callbacksByFrame.size > 0) {
        const frame = callbacksByFrame.values().next().value;
        if (!frame) {
          throw new Error("camera frame is missing");
        }
        callbacksByFrame.clear();
        frame(timestamp);
        frameCount += 1;
        timestamp += 16;
        if (frameCount > 24) {
          throw new Error("camera animation did not stop");
        }
      }
    });

    expect(callbacksByFrame).toHaveLength(0);
    expect(frameCount).toBe(24);
    expect(world).toHaveAttribute("data-camera-moving", "false");
    expect(world).toHaveStyle({ willChange: "" });
  });

  it("新しいcamera遷移は古いrequestAnimationFrameをcancelして多重化しない", () => {
    let nextFrameId = 1;
    const callbacksByFrame = new Map<number, FrameRequestCallback>();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      callbacksByFrame.set(frameId, callback);
      return frameId;
    });
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((frameId) => {
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
    const firstFrameId = nextFrameId - 1;
    const welfare = exploration.categories[2];
    if (!welfare) {
      throw new Error("fixture category is missing");
    }
    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{
          kind: "transitioning",
          current: { kind: "overview" },
          target: { kind: "category", category: welfare },
        }}
      />
    );

    expect(cancelAnimationFrame).toHaveBeenCalledWith(firstFrameId);
    expect(callbacksByFrame).toHaveLength(1);
  });

  it("documentがhiddenになるとcameraを確定位置へ進めて停止する", () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(91);
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");
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

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(91);
    expect(screen.getByTestId("budget-map-world")).toHaveAttribute(
      "data-camera-moving",
      "false"
    );
    expect(screen.getByTestId("budget-map-world")).toHaveStyle({
      willChange: "",
    });
  });

  it("camera遷移中にunmountしてもrequestAnimationFrameを解除する", () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(77);
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
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
    expect(removeWindowListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
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
    const matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: matchMedia,
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
    expect(document.querySelectorAll(".budget-map-star")).toHaveLength(70);
    expect(screen.getByTestId("budget-map-world")).toHaveStyle({
      width: "360px",
    });
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 1000px)");
  });

  it("状態を往復してもDOM・SVG・listenerが増殖しない", () => {
    const baseTopic = education.topics[0];
    const baseProgram = baseTopic?.programs[0];
    if (!baseTopic || !baseProgram) {
      throw new Error("fixture program is missing");
    }
    const topic = {
      ...baseTopic,
      programs: Array.from({ length: 10 }, (_, index) => ({
        ...baseProgram,
        budgetProgramIdentityId: `bpi_desktop_dom_${index + 1}`,
      })),
    };
    const { container, rerender, unmount } = render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );
    const overviewElementCount = container.querySelectorAll("*").length;

    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "category", category: education }}
      />
    );
    const categoryElementCount = container.querySelectorAll("*").length;
    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "topic", category: education, topic }}
      />
    );
    const topicElementCount = container.querySelectorAll("*").length;
    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "category", category: education }}
      />
    );
    expect(container.querySelectorAll("*")).toHaveLength(categoryElementCount);
    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );

    expect(container.querySelectorAll("*")).toHaveLength(overviewElementCount);
    expect(
      container.querySelectorAll("[data-testid='budget-map-edges']")
    ).toHaveLength(1);
    expect(overviewElementCount).toBeLessThanOrEqual(360);
    expect(categoryElementCount).toBeLessThanOrEqual(320);
    expect(topicElementCount).toBeLessThanOrEqual(370);
    unmount();
    expect(container.querySelectorAll("*")).toHaveLength(0);
  });

  it("mobileでは星と事業を抑えてDOM上限を保つ", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    const baseTopic = education.topics[0];
    const baseProgram = baseTopic?.programs[0];
    if (!baseTopic || !baseProgram) {
      throw new Error("fixture program is missing");
    }
    const topic = {
      ...baseTopic,
      programs: Array.from({ length: 10 }, (_, index) => ({
        ...baseProgram,
        budgetProgramIdentityId: `bpi_mobile_dom_${index + 1}`,
      })),
    };
    const { container, rerender } = render(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );
    const overviewElementCount = container.querySelectorAll("*").length;
    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "category", category: education }}
      />
    );
    const categoryElementCount = container.querySelectorAll("*").length;
    rerender(
      <BudgetNetwork
        {...callbacks}
        exploration={exploration}
        view={{ kind: "topic", category: education, topic }}
      />
    );
    const topicElementCount = container.querySelectorAll("*").length;

    expect(document.querySelectorAll(".budget-map-star")).toHaveLength(70);
    expect(
      screen.getAllByRole("button", { name: /当初予算額.*概要を見る/ })
    ).toHaveLength(6);
    expect(overviewElementCount).toBeLessThanOrEqual(225);
    expect(categoryElementCount).toBeLessThanOrEqual(180);
    expect(topicElementCount).toBeLessThanOrEqual(190);
  });
});
