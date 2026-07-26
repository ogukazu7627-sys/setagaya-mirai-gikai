// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { YearArchiveSection } from "./year-archive-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("YearArchiveSection", () => {
  it("keeps year selection inside the council page", () => {
    render(
      <YearArchiveSection
        basePath="/bills"
        archiveData={{
          years: [2025, 2024],
          selectedYear: 2025,
          billsByMajorCategory: [],
        }}
      />
    );

    expect(screen.getByText("前年以前の世田谷区議会")).toBeInTheDocument();
    expect(
      screen.getByText(
        "年を選ぶと、その年に始まった会期の案件をテーマ別に確認できます。"
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2025年" })).toHaveAttribute(
      "href",
      "/bills?archive_year=2025#archive"
    );
    expect(screen.getByRole("link", { name: "2024年" })).toHaveAttribute(
      "href",
      "/bills?archive_year=2024#archive"
    );
  });
});
