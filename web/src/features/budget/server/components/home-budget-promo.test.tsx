// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeBudgetPromo } from "./home-budget-promo";

describe("HomeBudgetPromo", () => {
  it("links from the home page to the budget experience", () => {
    render(<HomeBudgetPromo />);

    expect(
      screen.getByRole("heading", {
        name: "世田谷区の予算を、暮らしのテーマから見てみる",
      })
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /予算マップを開く/ })
    ).toHaveAttribute("href", "/budget");
    expect(
      screen.getByRole("link", { name: /公式分類で見る/ })
    ).toHaveAttribute("href", "/budget/all");
  });
});
