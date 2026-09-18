// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomePublicCommentSection } from "./home-public-comment-section";

describe("HomePublicCommentSection", () => {
  beforeEach(() => {
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

  it("shows every active public comment interview in a carousel", () => {
    render(<HomePublicCommentSection />);

    expect(
      screen.getByRole("heading", { name: "AIパブコメインタビュー" })
    ).toBeVisible();
    expect(
      screen.getByText(/世田谷区へ提出する意見の下書きをつくれます/)
    ).toBeVisible();

    expect(
      screen.getByRole("region", { name: "AIパブコメインタビュー一覧" })
    ).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getAllByRole("group")).toHaveLength(9);
    expect(screen.getByRole("group", { name: "1 / 9" })).toHaveClass(
      "basis-[86%]",
      "sm:basis-[48%]",
      "lg:basis-[32%]"
    );
    expect(screen.getByText("全9件")).toBeVisible();

    expect(
      screen.getByRole("link", {
        name: /第10期高齢者保健福祉計画・介護保険事業計画/,
      })
    ).toHaveAttribute("href", "/public-comment/elderly-care-plan");
    expect(
      screen.getByRole("link", {
        name: /第3期認知症とともに生きる希望計画/,
      })
    ).toHaveAttribute("href", "/public-comment/dementia-hope-plan");
    expect(
      screen.getByRole("link", { name: /民泊・旅館業の条例改正素案/ })
    ).toHaveAttribute("href", "/public-comment/minpaku");
    expect(
      screen.getByRole("link", {
        name: /がけ・擁壁等防災対策方針/,
      })
    ).toHaveAttribute("href", "/public-comment/retaining-wall");
    expect(
      screen.getByRole("link", { name: /第三次男女共同参画プラン/ })
    ).toHaveAttribute("href", "/public-comment/gender-equality");
    expect(
      screen.getByRole("link", { name: /世田谷区自殺対策計画/ })
    ).toHaveAttribute("href", "/public-comment/suicide-prevention");
    expect(
      screen.getByRole("link", {
        name: /障害理解・地域共生条例の改正素案/,
      })
    ).toHaveAttribute("href", "/public-comment/disability");
    expect(
      screen.getByRole("link", {
        name: /次期せたがやインクルージョンプラン/,
      })
    ).toHaveAttribute("href", "/public-comment/inclusion-plan");
    expect(
      screen.getByRole("link", {
        name: /いじめの予防と解消に向けた条例素案/,
      })
    ).toHaveAttribute("href", "/public-comment/ijime");

    expect(screen.getAllByText(/意見募集 9月29日/)).toHaveLength(2);
    expect(screen.getAllByText(/意見募集 10月6日/)).toHaveLength(4);
    expect(screen.getAllByText(/意見募集 10月7日/)).toHaveLength(2);
    expect(screen.getByText(/意見募集 10月8日/)).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "前のAIパブコメインタビューを見る",
      })
    ).toHaveClass("hidden", "md:inline-flex");
    expect(
      screen.getByRole("button", {
        name: "次のAIパブコメインタビューを見る",
      })
    ).toHaveClass("hidden", "md:inline-flex");
  });
});
