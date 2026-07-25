// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MainLayout } from "./main-layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

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
      "md:mt-[var(--app-header-layout-offset)]"
    );
  });
});
