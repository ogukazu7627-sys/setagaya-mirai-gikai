// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillCardData } from "@/features/bills/shared/types";
import { writeComponentState } from "@/features/public-view-state/client/utils/public-view-state-storage";
import { RecommendationBillsCarousel } from "./recommendation-bills-carousel";

vi.mock("@/features/bills/client/components/bill-list/bill-card", () => ({
  BillCard: ({ bill }: { bill: BillCardData }) => (
    <div>{bill.bill_content?.title}</div>
  ),
}));

const bills = Array.from({ length: 5 }, (_, index) => {
  const number = index + 1;
  return {
    id: `00000000-0000-4000-8000-00000000000${number}`,
    name: `おすすめ案件${number}`,
    bill_content: { title: `おすすめ案件${number}` },
    tags: [],
  } as unknown as BillCardData;
});

describe("RecommendationBillsCarousel", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
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

  it("5件を横方向のスライドと前後操作で表示する", async () => {
    const onBillViewed = vi.fn();
    const { container } = render(
      <RecommendationBillsCarousel bills={bills} onBillViewed={onBillViewed} />
    );

    expect(
      screen.getByRole("region", { name: "今日のおすすめ案件" })
    ).toBeVisible();
    const firstSlide = screen.getByRole("group", { name: "1 / 5" });
    expect(firstSlide).toBeVisible();
    expect(firstSlide).toHaveClass("basis-[86%]", "max-w-[634px]", "pl-2");
    expect(firstSlide).not.toHaveClass("sm:basis-[64%]");
    expect(firstSlide).not.toHaveClass("pc:basis-[44%]");
    expect(
      container.querySelector('[data-slot="carousel-content"] > div')
    ).toHaveClass("-ml-2");
    expect(screen.getByRole("group", { name: "5 / 5" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "前のおすすめを見る" })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "次のおすすめを見る" })
    ).toBeVisible();
    expect(screen.getByText("1 / 5")).toBeVisible();
    await waitFor(() => {
      expect(onBillViewed).toHaveBeenCalledWith(bills[0].id);
    });
    expect(onBillViewed).not.toHaveBeenCalledWith(bills[1].id);

    for (const [index, bill] of bills.entries()) {
      expect(
        screen.getByRole("link", { name: `おすすめ案件${index + 1}` })
      ).toHaveAttribute("href", `/bills/${bill.id}`);
    }
  });

  it("ページへ戻ると直前に見ていたおすすめ案件を表示する", async () => {
    writeComponentState("home-recommendation-carousel", {
      billId: bills[2].id,
    });

    render(<RecommendationBillsCarousel bills={bills} />);

    await waitFor(() => {
      expect(screen.getByText("3 / 5")).toBeVisible();
    });
  });
});
