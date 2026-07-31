// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  activeDatasetId: null,
  availability: "available",
  categories: [education],
};

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
          data: createBudgetMapHostMessage({
            kind: "category",
            category: education,
          }),
        })
      );
    });
    expect(
      screen.getByRole("group", { name: "教育に公開された課題" })
    ).toBeVisible();

    const topic = education.topics[0];
    if (!topic) {
      throw new Error("topic fixture is missing");
    }
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: createBudgetMapHostMessage({
            kind: "topic",
            category: education,
            topic,
          }),
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
          data: createBudgetMapHostMessage({
            kind: "category",
            category: education,
          }),
        })
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window.parent,
          data: {
            source: "mirai-gikai-budget-host",
            version: 1,
            action: "sync-view",
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
        version: 1,
        action: "select-category",
        categorySlug: "education",
      },
      window.location.origin
    );
    expect(postMessage).not.toHaveBeenCalledWith(expect.anything(), "*");
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
        version: 1,
        action: "select-topic",
        categorySlug: "education",
        topicSlug: "school-facility-aging",
      },
      window.location.origin
    );
  });

  it("topicからprogram選択を型付きmessageで親へ送る", async () => {
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

    expect(postMessage).toHaveBeenCalledWith(
      {
        source: "mirai-gikai-budget-map",
        version: 1,
        action: "select-program",
        budgetProgramIdentityId: "bpi_school",
      },
      window.location.origin
    );
  });
});
