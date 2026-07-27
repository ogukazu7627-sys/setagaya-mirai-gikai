// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileBottomNavigation } from "./mobile-bottom-navigation";

const navigationMock = vi.hoisted(() => ({
  pathname: "/",
  keyboardOpen: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
}));

vi.mock("../hooks/use-mobile-navigation-keyboard", () => ({
  useMobileNavigationKeyboard: () => navigationMock.keyboardOpen,
}));

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

afterEach(() => {
  navigationMock.pathname = "/";
  navigationMock.keyboardOpen = false;
});

describe("MobileBottomNavigation", () => {
  it("is fixed to the bottom and hidden at the desktop breakpoint", () => {
    const { container } = render(<MobileBottomNavigation />);
    expect(container.firstElementChild).toHaveClass(
      "app-mobile-primary-navigation",
      "fixed",
      "inset-x-0",
      "bottom-0",
      "z-30",
      "pc:hidden"
    );
  });

  it("renders on interview routes so users can leave from the bottom navigation", () => {
    navigationMock.pathname = "/bills/bill-id/interview/chat";
    render(<MobileBottomNavigation />);
    expect(
      screen.getByRole("navigation", { name: "主要ナビゲーション" })
    ).toBeInTheDocument();
  });

  it("does not render on non-public utility routes", () => {
    navigationMock.pathname = "/report/report-id/complete";
    render(<MobileBottomNavigation />);
    expect(
      screen.queryByRole("navigation", { name: "主要ナビゲーション" })
    ).not.toBeInTheDocument();
  });

  it("moves out of the way while a mobile text keyboard is active", () => {
    navigationMock.keyboardOpen = true;
    render(<MobileBottomNavigation />);
    expect(
      screen.queryByRole("navigation", { name: "主要ナビゲーション" })
    ).not.toBeInTheDocument();
  });
});
