// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicCouncilorXPost } from "../../shared/types/councilor-x-post";
import { CouncilorXPostsCarousel } from "./councilor-x-posts-carousel";

const carouselMock = vi.hoisted(() => {
  const listeners = new Map<string, Set<() => void>>();
  let selectedIndex = 0;
  const api = {
    selectedScrollSnap: vi.fn(() => selectedIndex),
    on: vi.fn((event: string, listener: () => void) => {
      const eventListeners = listeners.get(event) ?? new Set();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    }),
    off: vi.fn((event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener);
    }),
  };

  return {
    api,
    moveBy(delta: number) {
      selectedIndex = Math.max(0, Math.min(9, selectedIndex + delta));
      for (const listener of listeners.get("select") ?? []) {
        listener();
      }
    },
    reset() {
      selectedIndex = 0;
      listeners.clear();
      vi.clearAllMocks();
    },
  };
});

vi.mock("@/components/ui/carousel", async () => {
  const { useEffect } = await vi.importActual<typeof import("react")>("react");

  return {
    Carousel: ({
      children,
      className,
      setApi,
      "aria-label": ariaLabel,
    }: {
      children: ReactNode;
      className?: string;
      setApi?: (api: typeof carouselMock.api) => void;
      "aria-label"?: string;
    }) => {
      useEffect(() => {
        setApi?.(carouselMock.api);
      }, [setApi]);

      return (
        <section
          aria-label={ariaLabel}
          aria-roledescription="carousel"
          className={className}
        >
          {children}
        </section>
      );
    },
    CarouselContent: ({
      children,
      className,
    }: {
      children: ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    CarouselItem: ({
      children,
      className,
      "aria-label": ariaLabel,
    }: {
      children: ReactNode;
      className?: string;
      "aria-label"?: string;
    }) => (
      <div
        aria-label={ariaLabel}
        aria-roledescription="slide"
        className={className}
        role="group"
      >
        {children}
      </div>
    ),
    CarouselPrevious: ({
      className,
      "aria-label": ariaLabel,
    }: {
      className?: string;
      "aria-label"?: string;
    }) => (
      <button
        aria-label={ariaLabel}
        className={className}
        onClick={() => carouselMock.moveBy(-1)}
        type="button"
      />
    ),
    CarouselNext: ({
      className,
      "aria-label": ariaLabel,
    }: {
      className?: string;
      "aria-label"?: string;
    }) => (
      <button
        aria-label={ariaLabel}
        className={className}
        onClick={() => carouselMock.moveBy(1)}
        type="button"
      />
    ),
  };
});

vi.mock("next/script", () => ({
  default: ({ id, src }: { id: string; src: string }) => (
    <script data-testid="x-widgets-script" id={id} src={src} />
  ),
}));

vi.mock("./x-embedded-post", () => ({
  XEmbeddedPost: ({
    post,
    shouldLoad,
  }: {
    post: PublicCouncilorXPost;
    shouldLoad: boolean;
  }) => (
    <div data-testid={`post-${post.postId}`} data-should-load={shouldLoad}>
      {post.councilorName}
    </div>
  ),
}));

const posts = Array.from({ length: 10 }, (_, index) => ({
  postId: String(1_000 + index),
  councilorName: `議員${index + 1}`,
  postUrl: `https://x.com/member/status/${1_000 + index}`,
  postedAt: `2026-07-27T${String(10 - index).padStart(2, "0")}:00:00.000Z`,
}));

describe("CouncilorXPostsCarousel", () => {
  beforeEach(() => {
    carouselMock.reset();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("peek幅のスライドを作り、初回は先頭7件だけを読み込む", () => {
    render(<CouncilorXPostsCarousel posts={posts} />);

    expect(
      screen.getByRole("region", {
        name: "世田谷区議会議員の最新X投稿",
      })
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "1 / 10" })).toHaveClass(
      "basis-[88%]",
      "sm:basis-[min(550px,78%)]",
      "overflow-hidden",
      "self-start"
    );
    expect(screen.getAllByTestId("x-widgets-script")).toHaveLength(1);
    expect(screen.getByTestId("x-widgets-script")).toHaveAttribute(
      "src",
      "https://platform.twitter.com/widgets.js"
    );

    for (const [index, post] of posts.entries()) {
      expect(screen.getByTestId(`post-${post.postId}`)).toHaveAttribute(
        "data-should-load",
        index < 7 ? "true" : "false"
      );
    }
  });

  it("左右ボタンをデスクトップだけに表示する", () => {
    render(<CouncilorXPostsCarousel posts={posts} />);

    expect(screen.getByRole("button", { name: "前の投稿を見る" })).toHaveClass(
      "hidden",
      "md:inline-flex"
    );
    expect(screen.getByRole("button", { name: "次の投稿を見る" })).toHaveClass(
      "hidden",
      "md:inline-flex"
    );
  });

  it("次の投稿へ移動すると後続を追加で読み込み、位置を更新する", async () => {
    render(<CouncilorXPostsCarousel posts={posts} />);

    fireEvent.click(screen.getByRole("button", { name: "次の投稿を見る" }));

    await waitFor(() => {
      expect(screen.getByText("2 / 10")).toBeVisible();
    });
    expect(screen.getByTestId("post-1007")).toHaveAttribute(
      "data-should-load",
      "true"
    );
    expect(screen.getByTestId("post-1008")).toHaveAttribute(
      "data-should-load",
      "false"
    );

    fireEvent.click(screen.getByRole("button", { name: "前の投稿を見る" }));
    await waitFor(() => {
      expect(screen.getByText("1 / 10")).toBeVisible();
    });
    expect(screen.getByTestId("post-1007")).toHaveAttribute(
      "data-should-load",
      "true"
    );
  });
});
