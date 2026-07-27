// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { routes } from "@/lib/routes";
import { PrimaryNavigation } from "./primary-navigation";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PrimaryNavigation", () => {
  it.each([
    "desktop",
    "mobile",
  ] as const)("uses the required shared links and active state in %s mode", (variant) => {
    render(<PrimaryNavigation pathname="/bills/bill-id" variant={variant} />);

    const navigation = screen.getByRole("navigation", {
      name: "主要ナビゲーション",
    });
    const links = within(navigation).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "ホーム",
      "議会",
      "議員",
      "学ぶ",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      routes.home(),
      routes.bills(),
      routes.councilors(),
      routes.learn(),
    ]);
    expect(
      within(navigation).getByRole("link", { name: "議会" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("link", { name: "ホーム" })
    ).not.toHaveAttribute("aria-current");
    expect(navigation.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      4
    );
    expect(within(navigation).getByRole("link", { name: "議会" })).toHaveClass(
      "border-primary-strong",
      "text-primary-strong"
    );
    expect(
      within(navigation).getByRole("link", { name: "ホーム" })
    ).toHaveClass(
      "hover:text-primary-strong",
      "focus-visible:outline-primary-strong"
    );
  });

  it("uses four equal columns and 44px minimum tap targets on mobile", () => {
    render(<PrimaryNavigation pathname="/" variant="mobile" />);

    const navigation = screen.getByRole("navigation", {
      name: "主要ナビゲーション",
    });
    expect(navigation.querySelector("ul")).toHaveClass(
      "grid",
      "grid-cols-4",
      "h-[var(--mobile-primary-navigation-height)]"
    );
    for (const link of within(navigation).getAllByRole("link")) {
      expect(link).toHaveClass("min-h-11", "whitespace-nowrap");
    }
    expect(
      within(navigation).getByRole("link", { name: "ホーム" })
    ).toHaveClass("gap-0.5");
    expect(navigation.querySelector("svg")).toHaveClass("size-5");
  });

  it("keeps the desktop and mobile modes mutually exclusive at pc", () => {
    const { rerender } = render(
      <div className="hidden min-w-0 flex-1 pc:flex pc:justify-center">
        <PrimaryNavigation pathname="/" variant="desktop" />
      </div>
    );
    expect(screen.getByRole("navigation").parentElement).toHaveClass(
      "hidden",
      "pc:flex"
    );

    rerender(
      <div className="pc:hidden">
        <PrimaryNavigation pathname="/" variant="mobile" />
      </div>
    );
    expect(screen.getByRole("navigation").parentElement).toHaveClass(
      "pc:hidden"
    );
  });
});
