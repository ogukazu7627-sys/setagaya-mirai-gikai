// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CarouselOptions } from "@/components/ui/carousel";
import { CouncilQuestionNavigator } from "./council-question-navigator";

const navigationMocks = vi.hoisted(() => ({ push: vi.fn() }));
const carouselMock = vi.hoisted(() => {
  const listeners = new Map<string, Set<() => void>>();
  let selectedIndex = 0;
  let itemCount = 2;
  let options: Pick<NonNullable<CarouselOptions>, "watchDrag"> | undefined;
  const emit = (event: string) => {
    for (const listener of listeners.get(event) ?? []) {
      listener();
    }
  };
  const api = {
    canScrollNext: vi.fn(() => selectedIndex < itemCount - 1),
    canScrollPrev: vi.fn(() => selectedIndex > 0),
    off: vi.fn((_event: string, listener: () => void) => {
      listeners.get(_event)?.delete(listener);
    }),
    on: vi.fn((event: string, listener: () => void) => {
      const eventListeners = listeners.get(event) ?? new Set();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    }),
    scrollNext: vi.fn(() => {
      selectedIndex = Math.min(selectedIndex + 1, itemCount - 1);
      emit("select");
    }),
    scrollPrev: vi.fn(() => {
      selectedIndex = Math.max(selectedIndex - 1, 0);
      emit("select");
    }),
    scrollTo: vi.fn((index: number) => {
      selectedIndex = index;
    }),
    selectedScrollSnap: vi.fn(() => selectedIndex),
  };

  return {
    api,
    reset(nextItemCount = 2) {
      selectedIndex = 0;
      itemCount = nextItemCount;
      options = undefined;
      listeners.clear();
      vi.clearAllMocks();
    },
    getOptions() {
      return options;
    },
    setOptions(nextOptions: typeof options) {
      options = nextOptions;
    },
    select(index: number) {
      selectedIndex = index;
      emit("select");
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMocks.push }),
}));

vi.mock("@/components/ui/carousel", async () => {
  const { useEffect } = await vi.importActual<typeof import("react")>("react");

  return {
    Carousel: ({
      children,
      opts,
      setApi,
      "aria-label": ariaLabel,
    }: {
      children: ReactNode;
      opts?: Pick<NonNullable<CarouselOptions>, "watchDrag">;
      setApi?: (api: typeof carouselMock.api) => void;
      "aria-label"?: string;
    }) => {
      carouselMock.setOptions(opts);

      useEffect(() => {
        setApi?.(carouselMock.api);
      }, [setApi]);

      return (
        <section aria-label={ariaLabel} aria-roledescription="carousel">
          {children}
        </section>
      );
    },
    CarouselContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    CarouselItem: ({
      children,
      "aria-label": ariaLabel,
    }: {
      children: ReactNode;
      "aria-label"?: string;
    }) => (
      <div aria-label={ariaLabel} aria-roledescription="slide" role="group">
        {children}
      </div>
    ),
  };
});

const items = [
  {
    councilorId: "councilor-a",
    councilorDisplayName: "甲",
    councilorIconUrl: null,
    firstQuestionId: "11111111-1111-4111-8111-111111111111",
    questionCount: 2,
  },
  {
    councilorId: "councilor-b",
    councilorDisplayName: "乙",
    councilorIconUrl: null,
    firstQuestionId: "22222222-2222-4222-8222-222222222222",
    questionCount: 1,
  },
];
const slides = items.map((item) => ({
  content: <p>{item.councilorDisplayName}の質問本文</p>,
  councilorId: item.councilorId,
}));

describe("CouncilQuestionNavigator", () => {
  beforeEach(() => {
    carouselMock.reset();
    navigationMocks.push.mockReset();
  });

  it("一般質問では同じ年・大分類の次の議員へ移動する", () => {
    render(
      <CouncilQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        collection={{ kind: "general", categoryId: "education", year: 2026 }}
        items={items}
        slides={slides}
      />
    );

    expect(
      screen.getByRole("heading", { name: "議員、会派の意見" })
    ).toBeVisible();
    expect(screen.queryByText("質問 2件")).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "甲議員（2件）" })
    ).toBeInTheDocument();
    expect(screen.getByText("甲の質問本文")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "次の議員を見る" }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/bills/questions/2026/education?focus=${items[1].firstQuestionId}`,
      { scroll: false }
    );
    expect(
      screen.getByText("甲の質問本文").closest('[aria-roledescription="slide"]')
    ).not.toBeNull();
  });

  it("横スワイプで選ばれた次の議員へ移動する", () => {
    render(
      <CouncilQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        collection={{ kind: "budget", categorySlug: "education" }}
        items={items}
        slides={slides}
      />
    );

    expect(
      screen.getByRole("region", {
        name: "議員、会派の意見を切り替える",
      })
    ).toBeVisible();

    act(() => carouselMock.select(1));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/budget/questions/education?focus=${items[1].firstQuestionId}`,
      { scroll: false }
    );
  });

  it("発言本文上ではカルーセルのドラッグを開始しない", () => {
    render(
      <CouncilQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        collection={{ kind: "budget", categorySlug: "education" }}
        items={items}
        slides={slides}
      />
    );

    const watchDrag = carouselMock.getOptions()?.watchDrag;
    if (typeof watchDrag !== "function") {
      throw new Error("watchDrag is not configured");
    }

    const bubble = document.createElement("div");
    bubble.setAttribute("data-councilor-chat-bubble", "true");
    const text = document.createElement("span");
    bubble.appendChild(text);
    const outside = document.createElement("div");

    expect(
      watchDrag({} as never, { target: text } as unknown as MouseEvent)
    ).toBe(false);
    expect(
      watchDrag({} as never, { target: outside } as unknown as MouseEvent)
    ).toBe(true);
  });
});
