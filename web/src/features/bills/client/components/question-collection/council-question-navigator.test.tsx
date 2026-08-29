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
  let options:
    | Pick<
        NonNullable<CarouselOptions>,
        "skipSnaps" | "startIndex" | "watchDrag"
      >
    | undefined;
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
      const nextIndex = Math.max(0, Math.min(index, itemCount - 1));
      if (nextIndex === selectedIndex) {
        return;
      }
      selectedIndex = nextIndex;
      emit("select");
    }),
    selectedScrollSnap: vi.fn(() => selectedIndex),
  };

  return {
    api,
    reset(nextItemCount = 2, nextSelectedIndex = 0) {
      selectedIndex = nextSelectedIndex;
      itemCount = nextItemCount;
      options = undefined;
      listeners.clear();
      vi.clearAllMocks();
    },
    getOptions() {
      return options;
    },
    getSelectedIndex() {
      return selectedIndex;
    },
    setOptions(nextOptions: typeof options) {
      options = nextOptions;
    },
    select(index: number) {
      selectedIndex = Math.max(0, Math.min(index, itemCount - 1));
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
      opts?: Pick<
        NonNullable<CarouselOptions>,
        "skipSnaps" | "startIndex" | "watchDrag"
      >;
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

const fifteenItems = Array.from({ length: 15 }, (_, index) => ({
  councilorId: `councilor-${index + 1}`,
  councilorDisplayName: `議員${index + 1}`,
  councilorIconUrl: null,
  firstQuestionId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  questionCount: 1,
}));

function getWindowSlides(activeIndex: number) {
  const startIndex = Math.max(
    0,
    Math.min(activeIndex - 1, fifteenItems.length - 3)
  );
  return fifteenItems.slice(startIndex, startIndex + 3).map((item) => ({
    content: <p>{item.councilorDisplayName}の質問本文</p>,
    councilorId: item.councilorId,
  }));
}

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

  it("15人を1操作につき1人ずつ最後まで往復する", () => {
    carouselMock.reset(15);
    const { container } = render(
      <CouncilQuestionNavigator
        activeCouncilorId={fifteenItems[0].councilorId}
        collection={{ kind: "budget", categorySlug: "all" }}
        items={fifteenItems}
        slides={getWindowSlides(0)}
      />
    );

    const previousButton = screen.getByRole("button", {
      name: "前の議員を見る",
    });
    const nextButton = screen.getByRole("button", {
      name: "次の議員を見る",
    });

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
    expect(screen.getByText("1 / 15")).toBeVisible();
    expect(
      container.querySelectorAll("[data-council-question-slide]")
    ).toHaveLength(15);
    expect(
      container.querySelectorAll('[data-council-question-slide-loaded="true"]')
    ).toHaveLength(3);

    for (let position = 2; position <= 15; position += 1) {
      fireEvent.click(nextButton);
      expect(screen.getByText(`${position} / 15`)).toBeVisible();
      expect(carouselMock.getSelectedIndex()).toBe(position - 1);
      expect(previousButton).toBeEnabled();
      if (position === 15) {
        expect(nextButton).toBeDisabled();
      } else {
        expect(nextButton).toBeEnabled();
      }
    }

    expect(nextButton).toBeDisabled();
    for (let position = 14; position >= 1; position -= 1) {
      fireEvent.click(previousButton);
      expect(screen.getByText(`${position} / 15`)).toBeVisible();
      expect(carouselMock.getSelectedIndex()).toBe(position - 1);
      expect(nextButton).toBeEnabled();
      if (position === 1) {
        expect(previousButton).toBeDisabled();
      } else {
        expect(previousButton).toBeEnabled();
      }
    }

    expect(previousButton).toBeDisabled();
    expect(navigationMocks.push).toHaveBeenCalledTimes(28);
  });

  it("中間位置を何度往復しても1人ずつ移動する", () => {
    carouselMock.reset(15, 4);
    render(
      <CouncilQuestionNavigator
        activeCouncilorId={fifteenItems[4].councilorId}
        collection={{ kind: "general", categoryId: "all", year: 2026 }}
        items={fifteenItems}
        slides={getWindowSlides(4)}
      />
    );

    const previousButton = screen.getByRole("button", {
      name: "前の議員を見る",
    });
    const nextButton = screen.getByRole("button", {
      name: "次の議員を見る",
    });
    const expectPosition = (position: number) => {
      expect(screen.getByText(`${position} / 15`)).toBeVisible();
      expect(carouselMock.getSelectedIndex()).toBe(position - 1);
      expect(previousButton).toBeEnabled();
      expect(nextButton).toBeEnabled();
    };

    expectPosition(5);
    fireEvent.click(previousButton);
    expectPosition(4);
    fireEvent.click(nextButton);
    expectPosition(5);
    fireEvent.click(nextButton);
    expectPosition(6);
    fireEvent.click(previousButton);
    expectPosition(5);
    fireEvent.click(nextButton);
    expectPosition(6);
    fireEvent.click(nextButton);
    expectPosition(7);

    fireEvent.change(screen.getByLabelText("議員を選ぶ"), {
      target: { value: fifteenItems[9].councilorId },
    });
    expectPosition(10);
    fireEvent.click(previousButton);
    expectPosition(9);
    fireEvent.click(nextButton);
    expectPosition(10);
    fireEvent.click(nextButton);
    expectPosition(11);
    fireEvent.click(previousButton);
    expectPosition(10);
    fireEvent.click(nextButton);
    expectPosition(11);

    expect(navigationMocks.push).toHaveBeenCalledTimes(12);
  });

  it("URL同期で3人分の本文windowが差し替わってもindexを飛ばさない", () => {
    carouselMock.reset(15, 4);
    const renderNavigator = (activeIndex: number) => (
      <CouncilQuestionNavigator
        activeCouncilorId={fifteenItems[activeIndex].councilorId}
        collection={{ kind: "budget", categorySlug: "all" }}
        items={fifteenItems}
        slides={getWindowSlides(activeIndex)}
      />
    );
    const { rerender } = render(renderNavigator(4));
    const previousButton = screen.getByRole("button", {
      name: "前の議員を見る",
    });
    const nextButton = screen.getByRole("button", {
      name: "次の議員を見る",
    });

    fireEvent.click(nextButton);
    expect(screen.getByText("6 / 15")).toBeVisible();
    rerender(renderNavigator(5));
    expect(screen.getByText("6 / 15")).toBeVisible();
    expect(nextButton).toBeEnabled();

    fireEvent.click(previousButton);
    expect(screen.getByText("5 / 15")).toBeVisible();
    rerender(renderNavigator(4));
    expect(screen.getByText("5 / 15")).toBeVisible();

    fireEvent.click(nextButton);
    expect(screen.getByText("6 / 15")).toBeVisible();
    rerender(renderNavigator(5));
    fireEvent.click(nextButton);
    expect(screen.getByText("7 / 15")).toBeVisible();
    rerender(renderNavigator(6));

    expect(screen.getByText("7 / 15")).toBeVisible();
    expect(carouselMock.getSelectedIndex()).toBe(6);
    expect(nextButton).toBeEnabled();
    expect(navigationMocks.push).toHaveBeenCalledTimes(4);
  });

  it("スワイプが複数snapを跨いでも1人分に補正する", () => {
    carouselMock.reset(15, 4);
    render(
      <CouncilQuestionNavigator
        activeCouncilorId={fifteenItems[4].councilorId}
        collection={{ kind: "budget", categorySlug: "all" }}
        items={fifteenItems}
        slides={getWindowSlides(4)}
      />
    );

    expect(carouselMock.getOptions()?.skipSnaps).toBe(false);
    act(() => carouselMock.select(6));

    expect(screen.getByText("6 / 15")).toBeVisible();
    expect(carouselMock.getSelectedIndex()).toBe(5);
    expect(navigationMocks.push).toHaveBeenCalledTimes(1);
    expect(navigationMocks.push).toHaveBeenLastCalledWith(
      `/budget/questions/all?focus=${fifteenItems[5].firstQuestionId}`,
      { scroll: false }
    );

    act(() => carouselMock.select(3));

    expect(screen.getByText("5 / 15")).toBeVisible();
    expect(carouselMock.getSelectedIndex()).toBe(4);
    expect(navigationMocks.push).toHaveBeenCalledTimes(2);
  });
});
