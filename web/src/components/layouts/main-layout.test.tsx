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
  it("uses safe-area offset on mobile and the measured header offset from 768px", () => {
    const { container } = render(
      <MainLayout>
        <div>content</div>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass(
      "pt-[var(--app-header-layout-offset)]",
      "min-[768px]:pt-0",
      "min-[768px]:mt-[var(--app-header-layout-offset)]"
    );
  });

  it.each([
    "/",
    "/bills/abc-123",
    "/preview/bills/abc-123",
  ])("reserves desktop chat-panel space on %s", (pathname) => {
    navigationMock.pathname = pathname;
    const { container } = render(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass(
      "pc:mr-[500px]",
      "pc:w-[calc(100vw-500px-2rem)]",
      "xl:ml-[calc(calc(100vw-1180px)/2)]",
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

  it("reserves bottom-navigation space on public interview routes", () => {
    navigationMock.pathname = "/bills/bill-id/interview/chat";
    const { container } = render(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass(
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

  it("centers the council directory without desktop chat-panel space", () => {
    navigationMock.pathname = "/bills";
    const { container } = render(
      <MainLayout>
        <main>content</main>
      </MainLayout>
    );

    expect(container.firstElementChild).toHaveClass("mx-auto", "max-w-[700px]");
    expect(container.firstElementChild).not.toHaveClass("pc:mr-[500px]");
    expect(container.firstElementChild).not.toHaveClass(
      "pc:w-[calc(100vw-500px-2rem)]"
    );
    expect(container.firstElementChild).not.toHaveClass(
      "xl:ml-[calc(calc(100vw-1180px)/2)]"
    );
    expect(container.firstElementChild).not.toHaveClass("xl:w-[700px]");
  });
});
