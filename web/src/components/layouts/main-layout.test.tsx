// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MainLayout } from "./main-layout";

const navigationMock = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
}));

afterEach(() => {
  navigationMock.pathname = "/";
});

describe("MainLayout", () => {
  it("reserves the shared fixed-header offset on mobile and desktop", () => {
    const { container } = render(
      <MainLayout>
        <div>content</div>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass(
      "pt-[var(--app-header-layout-offset)]",
      "md:pt-0",
      "md:mt-[var(--app-header-layout-offset)]",
      "pc:w-[calc(100vw-500px-2rem)]",
      "xl:w-[700px]"
    );
  });

  it("reserves mobile bottom-navigation space only on general routes", () => {
    const { container, rerender } = render(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass(
      "layout-with-mobile-primary-navigation"
    );

    navigationMock.pathname = "/report/report-id/complete";
    rerender(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );
    expect(container.firstElementChild).not.toHaveClass(
      "layout-with-mobile-primary-navigation"
    );
  });

  it("uses the wide layout for the learn index and lesson pages", () => {
    navigationMock.pathname = "/learn";
    const { container, rerender } = render(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass("max-w-[1180px]");
    expect(container.firstElementChild).not.toHaveClass("max-w-[700px]");

    navigationMock.pathname = "/learn/bill-process";
    rerender(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );
    expect(container.firstElementChild).toHaveClass("max-w-[1180px]");
  });

  it("reserves desktop space for the council directory chat panel", () => {
    navigationMock.pathname = "/bills";
    const { container } = render(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass(
      "pc:mr-[500px]",
      "pc:w-[calc(100vw-500px-2rem)]",
      "xl:w-[700px]"
    );
  });
});
