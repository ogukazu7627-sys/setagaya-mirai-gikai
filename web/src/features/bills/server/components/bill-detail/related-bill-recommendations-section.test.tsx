// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "@/features/bills/shared/types";

vi.mock(
  "@/features/bills/client/components/bill-list/compact-bill-card",
  () => ({
    CompactBillCard: ({ bill }: { bill: BillWithContent }) => (
      <article>{bill.name}</article>
    ),
  })
);

import { RelatedBillRecommendationsSection } from "./related-bill-recommendations-section";

describe("RelatedBillRecommendationsSection", () => {
  it("関連案件をデスクトップで2列のカードグリッドとして表示する", () => {
    render(
      <RelatedBillRecommendationsSection
        bills={[
          createBill("bill-1"),
          createBill("bill-2"),
          createBill("bill-3"),
          createBill("bill-4"),
        ]}
      />
    );

    const section = screen.getByRole("region", { name: "関連する案件" });
    const links = screen.getAllByRole("link");
    const grid = section.querySelector(".grid");

    expect(
      screen.getByRole("heading", { level: 2, name: "関連する案件" })
    ).toBeVisible();
    expect(links).toHaveLength(4);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/bills/bill-1",
      "/bills/bill-2",
      "/bills/bill-3",
      "/bills/bill-4",
    ]);
    expect(grid).toHaveClass("grid-cols-1", "md:grid-cols-2");
  });

  it("案件がない場合はセクションを表示しない", () => {
    const { container } = render(
      <RelatedBillRecommendationsSection bills={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});

function createBill(id: string): BillWithContent {
  return {
    id,
    name: `案件 ${id}`,
    tags: [],
  } as unknown as BillWithContent;
}
