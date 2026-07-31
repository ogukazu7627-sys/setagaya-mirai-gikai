// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetExplorationData } from "../../shared/types/budget-exploration";
import {
  createBudgetMapHostMessage,
  createBudgetMapMessage,
} from "../../shared/utils/budget-map-message";
import {
  BUDGET_MAP_LOAD_TIMEOUT_MS,
  BudgetMapIframe,
} from "./budget-map-iframe";

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

const callbacks = {
  onBack: vi.fn(),
  onFocusSearch: vi.fn(),
  onOpenOfficialHierarchy: vi.fn(),
  onSelectCategory: vi.fn(),
  onSelectProgram: vi.fn(),
  onSelectTopic: vi.fn(),
};

describe("BudgetMapIframe", () => {
  beforeEach(() => {
    for (const callback of Object.values(callbacks)) {
      callback.mockReset();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("独立map routeを安全なsandboxと固定URLのiframeで埋め込む", () => {
    const category = exploration.categories[0];
    const topic = category?.topics[0];
    if (!category || !topic) {
      throw new Error("topic fixture is missing");
    }

    render(
      <BudgetMapIframe
        {...callbacks}
        exploration={exploration}
        view={{
          kind: "topic",
          category,
          topic,
        }}
      />
    );

    const iframe = screen.getByTitle("触れる予算の探索マップ");
    expect(iframe).toHaveAttribute("src", "/budget/map?embed=1");
    expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-same-origin"
    );
    expect(iframe.getAttribute("sandbox")).not.toContain(
      "allow-top-navigation"
    );
    expect(iframe).not.toHaveAttribute("allow");
    expect(iframe).toHaveClass("budget-map-frame-topic", "w-full", "border-0");
    expect(screen.getByRole("status")).toHaveTextContent(
      "予算宇宙を準備しています"
    );

    fireEvent.load(iframe);
    expect(screen.getByRole("status")).toHaveTextContent(
      "予算宇宙を準備しています"
    );
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: (iframe as HTMLIFrameElement).contentWindow,
          data: createBudgetMapMessage({ action: "ready" }),
        })
      );
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(iframe).not.toHaveClass("budget-map-frame-loading");
    expect(iframe.closest("[data-map-loaded]")).toHaveAttribute(
      "data-map-loaded",
      "true"
    );
  });

  it("load timeout時も検索・公式分類へ到達でき、同じ固定URLを再読込する", () => {
    vi.useFakeTimers();
    render(
      <BudgetMapIframe
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );
    fireEvent.load(screen.getByTitle("触れる予算の探索マップ"));

    act(() => {
      vi.advanceTimersByTime(BUDGET_MAP_LOAD_TIMEOUT_MS);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "予算マップを読み込めませんでした"
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByTitle("触れる予算の探索マップ").closest("[data-map-status]")
    ).toHaveAttribute("data-map-status", "error");

    fireEvent.click(screen.getByRole("button", { name: "予算検索" }));
    fireEvent.click(screen.getByRole("button", { name: "公式分類から探す" }));
    expect(callbacks.onFocusSearch).toHaveBeenCalledOnce();
    expect(callbacks.onOpenOfficialHierarchy).toHaveBeenCalledOnce();

    const firstIframe = screen.getByTitle("触れる予算の探索マップ");
    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    const retriedIframe = screen.getByTitle("触れる予算の探索マップ");
    expect(retriedIframe).not.toBe(firstIframe);
    expect(retriedIframe).toHaveAttribute("src", "/budget/map?embed=1");
    expect(retriedIframe.closest("[data-map-status]")).toHaveAttribute(
      "data-map-status",
      "loading"
    );
  });

  it("親の表示状態を固定iframeへ同一originの型付きmessageで同期する", () => {
    const category = exploration.categories[0];
    const topic = category?.topics[0];
    if (!category || !topic) {
      throw new Error("topic fixture is missing");
    }
    const { rerender } = render(
      <BudgetMapIframe
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );
    const iframe = screen.getByTitle(
      "触れる予算の探索マップ"
    ) as HTMLIFrameElement;
    const postMessage = vi
      .spyOn(iframe.contentWindow as Window, "postMessage")
      .mockImplementation(() => undefined);

    fireEvent.load(iframe);
    expect(postMessage).toHaveBeenLastCalledWith(
      createBudgetMapHostMessage({ kind: "overview" }),
      window.location.origin
    );

    rerender(
      <BudgetMapIframe
        {...callbacks}
        exploration={exploration}
        view={{
          kind: "transitioning",
          current: { kind: "overview" },
          target: { kind: "topic", category, topic },
        }}
      />
    );
    expect(iframe).toHaveAttribute("src", "/budget/map?embed=1");
    expect(postMessage).toHaveBeenLastCalledWith(
      createBudgetMapHostMessage({
        kind: "transitioning",
        current: { kind: "overview" },
        target: { kind: "topic", category, topic },
      }),
      window.location.origin
    );
  });

  it("同一originかつ対象iframeから届いた既知のIDだけを親導線へ渡す", () => {
    render(
      <BudgetMapIframe
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );
    const iframe = screen.getByTitle(
      "触れる予算の探索マップ"
    ) as HTMLIFrameElement;

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://attacker.example",
        source: iframe.contentWindow,
        data: createBudgetMapMessage({
          action: "select-category",
          categorySlug: "education",
        }),
      })
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: null,
        data: createBudgetMapMessage({
          action: "select-category",
          categorySlug: "education",
        }),
      })
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: iframe.contentWindow,
        data: createBudgetMapMessage({
          action: "select-program",
          budgetProgramIdentityId: "bpi_unknown",
        }),
      })
    );
    expect(callbacks.onSelectCategory).not.toHaveBeenCalled();
    expect(callbacks.onSelectProgram).not.toHaveBeenCalled();

    const postMessage = vi
      .spyOn(iframe.contentWindow as Window, "postMessage")
      .mockImplementation(() => undefined);
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe.contentWindow,
          data: createBudgetMapMessage({ action: "ready" }),
        })
      );
    });
    expect(postMessage).toHaveBeenLastCalledWith(
      createBudgetMapHostMessage({ kind: "overview" }),
      window.location.origin
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: iframe.contentWindow,
        data: createBudgetMapMessage({
          action: "select-category",
          categorySlug: "education",
        }),
      })
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: iframe.contentWindow,
        data: createBudgetMapMessage({
          action: "select-topic",
          categorySlug: "education",
          topicSlug: "school-facility-aging",
        }),
      })
    );
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
    expect(callbacks.onSelectCategory).toHaveBeenCalledWith("education");
    expect(callbacks.onSelectTopic).toHaveBeenCalledWith(
      "education",
      "school-facility-aging"
    );
    expect(callbacks.onSelectProgram).toHaveBeenCalledWith("bpi_school");
  });

  it("unmount後はiframeからのmessageを処理しない", () => {
    const { unmount } = render(
      <BudgetMapIframe
        {...callbacks}
        exploration={exploration}
        view={{ kind: "overview" }}
      />
    );
    const iframe = screen.getByTitle(
      "触れる予算の探索マップ"
    ) as HTMLIFrameElement;
    const iframeWindow = iframe.contentWindow;
    unmount();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: iframeWindow,
        data: createBudgetMapMessage({
          action: "select-category",
          categorySlug: "education",
        }),
      })
    );

    expect(callbacks.onSelectCategory).not.toHaveBeenCalled();
  });
});
