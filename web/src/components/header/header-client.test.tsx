// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderClient } from "./header-client";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
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
});
