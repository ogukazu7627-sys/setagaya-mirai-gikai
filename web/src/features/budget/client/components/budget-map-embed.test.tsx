// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EDUCATION_SCHOOL_AGING_EXPLORATION,
  TEST_ACTIVE_BUDGET_DATASET,
} from "../../shared/test-data/education-school-aging-exploration";
import type {
  BudgetExplorationCategory,
  BudgetExplorationData,
} from "../../shared/types/budget-exploration";
import { createBudgetMapHostMessage } from "../../shared/utils/budget-map-message";
import { BudgetMapEmbed } from "./budget-map-embed";

const education: BudgetExplorationCategory = {
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
};

const exploration: BudgetExplorationData = {
  activeDataset: TEST_ACTIVE_BUDGET_DATASET,
  availability: "available",
  categories: [education],
};
const OTHER_DATASET_ID = "22222222-2222-4222-8222-222222222222";

describe("BudgetMapEmbed", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("min-width"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("iframe内部にheader/footerを重複させずBudgetNetworkを表示する", () => {
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "overview" }}
      />
    );

    expect(
      screen.getByRole("group", {
        name: "予算を10の分野から探すネットワーク",
      })
    ).toBeVisible();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "10の分野から予算を探せます"
    );
  });

  it("親の固定URLから届くcategory/topic状態を検証して表示へ反映する", () => {
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "overview" }}
      />
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: createBudgetMapHostMessage(
            {
              kind: "category",
              category: education,
            },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });
    expect(
      screen.getByRole("group", { name: "教育に公開されたテーマ" })
    ).toBeVisible();
    const categoryCore = screen.getByRole("img", {
      name: "選択中の分野、教育、令和8年度当初予算",
    });
    expect(categoryCore).toHaveAttribute("data-placement", "inside");
    expect(categoryCore).toHaveTextContent("教育");
    expect(categoryCore).toHaveTextContent("令和8年度当初予算");
    expect(categoryCore).not.toHaveTextContent("公開中のテーマ");

    const topic = education.topics[0];
    if (!topic) {
      throw new Error("topic fixture is missing");
    }
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: createBudgetMapHostMessage(
            {
              kind: "topic",
              category: education,
              topic,
            },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });
    expect(
      screen.getByRole("group", {
        name: "学校施設の老朽化への対応に関連する予算事業",
      })
    ).toBeVisible();
  });

  it("異なるoriginや未知IDの親同期messageを無視する", () => {
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "overview" }}
      />
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://attacker.example",
          source: window.parent,
          data: createBudgetMapHostMessage(
            {
              kind: "category",
              category: education,
            },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: {
            source: "mirai-gikai-budget-host",
            version: 2,
            action: "sync-view",
            activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
            view: {
              kind: "category",
              categorySlug: "unknown-category",
            },
          },
        })
      );
    });

    expect(
      screen.getByRole("group", {
        name: "予算を10の分野から探すネットワーク",
      })
    ).toBeVisible();
  });

  it("親とactive datasetが異なる同期messageを拒否して通知する", () => {
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "overview" }}
      />
    );
    postMessage.mockClear();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: createBudgetMapHostMessage(
            { kind: "category", category: education },
            OTHER_DATASET_ID
          ),
        })
      );
    });

    expect(
      screen.getByRole("group", {
        name: "予算を10の分野から探すネットワーク",
      })
    ).toBeVisible();
    expect(postMessage).toHaveBeenCalledWith(
      {
        source: "mirai-gikai-budget-map",
        version: 2,
        activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
        action: "dataset-mismatch",
      },
      window.location.origin
    );
  });

  it("中心ラベルの年度をactive datasetメタデータから表示する", () => {
    render(
      <BudgetMapEmbed
        exploration={{
          ...exploration,
          activeDataset: {
            ...TEST_ACTIVE_BUDGET_DATASET,
            fiscalYear: 2027,
          },
        }}
        initialView={{ kind: "overview" }}
      />
    );

    expect(
      screen.getByRole("img", {
        name: "令和9年度当初予算、世田谷区の予算",
      })
    ).toBeVisible();
  });

  it("categoryの分野名と年度を中心ノード内へ表示する", () => {
    render(
      <BudgetMapEmbed
        exploration={{
          ...exploration,
          activeDataset: {
            ...TEST_ACTIVE_BUDGET_DATASET,
            fiscalYear: 2027,
          },
        }}
        initialView={{ kind: "category", category: education }}
      />
    );

    const categoryCore = screen.getByRole("img", {
      name: "選択中の分野、教育、令和9年度当初予算",
    });
    expect(categoryCore).toHaveAttribute("data-placement", "inside");
    expect(categoryCore).toHaveTextContent("教育");
    expect(categoryCore).toHaveTextContent("令和9年度当初予算");
    expect(screen.queryByText(/公開中のテーマ/)).not.toBeInTheDocument();
  });

  it("active datasetがない場合は公開準備中の空状態を表示する", () => {
    render(
      <BudgetMapEmbed
        exploration={{
          activeDataset: null,
          availability: "no_active_dataset",
          categories: exploration.categories.map((category) => ({
            ...category,
            topics: [],
          })),
        }}
        initialView={{ kind: "overview" }}
      />
    );

    expect(
      screen.getByText("公開中の予算データはまだありません")
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "当初予算、世田谷区の予算" })
    ).toBeVisible();
  });

  it("操作を任意URLではなく型付きmessageとして同一originの親へ送る", async () => {
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "overview" }}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "教育から予算を探す" })
    );

    expect(postMessage).toHaveBeenCalledWith(
      {
        source: "mirai-gikai-budget-map",
        version: 2,
        activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
        action: "select-category",
        categorySlug: "education",
      },
      window.location.origin
    );
    expect(postMessage).not.toHaveBeenCalledWith(expect.anything(), "*");
  });

  it("Spaceでcategoryを選択できる", async () => {
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "overview" }}
      />
    );
    const educationButton = screen.getByRole("button", {
      name: "教育から予算を探す",
    });
    educationButton.focus();

    await user.keyboard(" ");

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "select-category",
        categorySlug: "education",
      }),
      window.location.origin
    );
  });

  it("Escapeでcategory/topicから既存の戻るmessageを送る", () => {
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "category", category: education }}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(postMessage).toHaveBeenCalledWith(
      {
        source: "mirai-gikai-budget-map",
        version: 2,
        activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
        action: "back",
      },
      window.location.origin
    );
  });

  it("categoryからtopic選択を型付きmessageで親へ送る", async () => {
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "category", category: education }}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: "学校施設の老朽化への対応に関連する予算事業を見る",
      })
    );

    expect(postMessage).toHaveBeenCalledWith(
      {
        source: "mirai-gikai-budget-map",
        version: 2,
        activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
        action: "select-topic",
        categorySlug: "education",
        topicSlug: "school-facility-aging",
      },
      window.location.origin
    );
  });

  it("事業選択ではiframe内パネルを開き、詳細ボタンでだけ親へ通知する", async () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("topic fixture is missing");
    }
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "topic", category: education, topic }}
      />
    );

    const programButton = screen.getByRole("button", {
      name: /小学校施設改修工事、当初予算額/,
    });
    await user.click(programButton);

    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "select-program" }),
      expect.anything()
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("小学校施設改修工事")).toBeVisible();
    expect(within(dialog).getByText("10万円")).toBeVisible();
    expect(
      within(dialog).getByText("一般的な説明（みらい議会）")
    ).toBeVisible();
    expect(
      within(dialog).getByText(
        /小学校の校舎や設備の劣化・不具合を改修し、安全に使い続けられる状態に整える/
      )
    ).toBeVisible();
    expect(within(dialog).getByText("一般会計")).toBeVisible();
    expect(within(dialog).getByText("教育費")).toBeVisible();
    expect(within(dialog).getByText("小学校費")).toBeVisible();
    expect(within(dialog).getByText("学校施設費")).toBeVisible();
    expect(within(dialog).getByText("教育環境課")).toBeVisible();
    expect(dialog).toHaveAttribute("data-panel-side", "right");
    expect(programButton).toHaveAttribute("data-selected", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.click(
      within(dialog).getByRole("button", {
        name: "詳しい予算情報を見る",
      })
    );

    expect(postMessage).toHaveBeenCalledWith(
      {
        source: "mirai-gikai-budget-map",
        version: 2,
        activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
        action: "select-program",
        budgetProgramIdentityId: "bpi_school",
      },
      window.location.origin
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escapeはプレビューパネルだけを閉じ、親へ戻る通知を送らない", async () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("topic fixture is missing");
    }
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "topic", category: education, topic }}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /小学校施設改修工事、当初予算額/,
      })
    );
    expect(screen.getByRole("dialog")).toBeVisible();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "back" }),
      expect.anything()
    );
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "select-program" }),
      expect.anything()
    );
  });

  it("親からviewが切り替わると選択中の事業を解除する", async () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("topic fixture is missing");
    }
    const user = userEvent.setup();
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "topic", category: education, topic }}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /小学校施設改修工事、当初予算額/,
      })
    );
    expect(screen.getByRole("dialog")).toBeVisible();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: createBudgetMapHostMessage(
            { kind: "category", category: education },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "教育に公開されたテーマ" })
    ).toBeVisible();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: createBudgetMapHostMessage(
            { kind: "topic", category: education, topic },
            TEST_ACTIVE_BUDGET_DATASET.id
          ),
        })
      );
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("active datasetが切り替わると選択中の事業を解除する", async () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("topic fixture is missing");
    }
    const user = userEvent.setup();
    const { rerender } = render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "topic", category: education, topic }}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /小学校施設改修工事、当初予算額/,
      })
    );
    expect(screen.getByRole("dialog")).toBeVisible();

    rerender(
      <BudgetMapEmbed
        exploration={{
          ...exploration,
          activeDataset: {
            ...TEST_ACTIVE_BUDGET_DATASET,
            id: OTHER_DATASET_ID,
          },
        }}
        initialView={{ kind: "topic", category: education, topic }}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "topic", category: education, topic }}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("モバイルではプレビューパネルを下から表示する", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("topic fixture is missing");
    }
    const user = userEvent.setup();
    render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "topic", category: education, topic }}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /小学校施設改修工事、当初予算額/,
      })
    );

    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-panel-side",
      "bottom"
    );
  });

  it("iframe内で承認済み13事業を10件と3件のページとして表示する", async () => {
    const approvedCategory = EDUCATION_SCHOOL_AGING_EXPLORATION.categories[0];
    const approvedTopic = approvedCategory?.topics[0];
    if (!approvedCategory || !approvedTopic) {
      throw new Error("approved exploration fixture is missing");
    }
    const user = userEvent.setup();

    render(
      <BudgetMapEmbed
        exploration={EDUCATION_SCHOOL_AGING_EXPLORATION}
        initialView={{
          kind: "topic",
          category: approvedCategory,
          topic: approvedTopic,
        }}
      />
    );

    expect(
      screen.getAllByRole("button", { name: /、概要を見る$/ })
    ).toHaveLength(10);
    expect(
      screen.queryByText(/関連する予算事業\s*\d+件/)
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 / 2 ページ")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "次のページ" }));

    expect(
      screen.getAllByRole("button", { name: /、概要を見る$/ })
    ).toHaveLength(3);
    expect(screen.getByText("2 / 2 ページ")).toBeVisible();
  });

  it("unmount時にmessageとkeydown listenerを解除する", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <BudgetMapEmbed
        exploration={exploration}
        initialView={{ kind: "category", category: education }}
      />
    );

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });
});
