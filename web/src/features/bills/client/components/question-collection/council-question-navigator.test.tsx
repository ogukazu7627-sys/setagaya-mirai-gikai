// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CouncilQuestionNavigator } from "./council-question-navigator";

const navigationMocks = vi.hoisted(() => ({ push: vi.fn() }));
const carouselMock = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let selectedIndex = 0;
  const api = {
    off: vi.fn((_event: string, listener: () => void) => {
      listeners.delete(listener);
    }),
    on: vi.fn((_event: string, listener: () => void) => {
      listeners.add(listener);
    }),
    scrollTo: vi.fn((index: number) => {
      selectedIndex = index;
    }),
    selectedScrollSnap: vi.fn(() => selectedIndex),
  };

  return {
    api,
    reset() {
      selectedIndex = 0;
      listeners.clear();
      vi.clearAllMocks();
    },
    select(index: number) {
      selectedIndex = index;
      for (const listener of listeners) {
        listener();
      }
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
      setApi,
      "aria-label": ariaLabel,
    }: {
      children: ReactNode;
      setApi?: (api: typeof carouselMock.api) => void;
      "aria-label"?: string;
    }) => {
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
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "次の議員を見る" }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/bills/questions/2026/education?focus=${items[1].firstQuestionId}`,
      { scroll: false }
    );
    expect(screen.getByText("質問 2件")).toBeVisible();
  });

  it("横スワイプで選ばれた次の議員へ移動する", () => {
    render(
      <CouncilQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        collection={{ kind: "budget", categorySlug: "education" }}
        items={items}
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
});
