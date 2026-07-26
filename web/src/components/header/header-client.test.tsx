// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderClient } from "./header-client";

const navigationMock = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
}));

vi.mock("next/image", () => ({
  default: ({ alt, className }: { alt: string; className?: string }) => (
    <span className={className}>{alt}</span>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}));

vi.mock(
  "@/features/bill-difficulty/client/components/difficulty-selector",
  () => ({
    DifficultySelector: () => <div>difficulty</div>,
  })
);

vi.mock(
  "@/features/interview-session/client/components/interview-header-actions",
  () => ({
    InterviewHeaderActions: () => <div>interview</div>,
  })
);

vi.mock("./hamburger-menu", () => ({
  HamburgerMenu: () => <div>menu</div>,
}));

afterEach(() => {
  navigationMock.pathname = "/";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("--app-header-height");
});

describe("HeaderClient", () => {
  it("measures the fixed header and exposes its actual height", async () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect = disconnect;
      }
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 320,
      height: 72,
      top: 0,
      right: 320,
      bottom: 72,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const { container, unmount } = render(
      <HeaderClient difficultyLevel="normal" />
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("app-fixed-header", "fixed");
    expect(screen.getByText("みらい議会＠世田谷区")).toHaveClass(
      "h-8",
      "min-[360px]:h-9",
      "sm:h-11"
    );
    await waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue("--app-header-height")
      ).toBe("72px")
    );

    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(
      document.documentElement.style.getPropertyValue("--app-header-height")
    ).toBe("");
  });

  it("renders the shared desktop primary navigation only on general routes", () => {
    const { rerender } = render(<HeaderClient difficultyLevel="normal" />);

    expect(
      screen.getByRole("navigation", { name: "主要ナビゲーション" })
    ).toHaveAttribute("data-primary-navigation", "desktop");
    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("議会")).toBeInTheDocument();
    expect(screen.getByText("議員")).toBeInTheDocument();
    expect(screen.getByText("学ぶ")).toBeInTheDocument();

    navigationMock.pathname = "/preview/bills/bill-id";
    rerender(<HeaderClient difficultyLevel="normal" />);
    expect(
      screen.queryByRole("navigation", { name: "主要ナビゲーション" })
    ).not.toBeInTheDocument();
  });

  it("shows the explanation detail toggle on the council top page", () => {
    navigationMock.pathname = "/bills";

    render(<HeaderClient difficultyLevel="normal" />);

    expect(screen.getByText("difficulty")).toBeInTheDocument();
  });
});
