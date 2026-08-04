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
        name: "世田谷区の予算",
      })
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: /予算を見やすく、\s*分かりやすく/,
      })
    ).toBeVisible();
    expect(screen.getByText("触れる予算")).toBeVisible();
    expect(screen.getByText(/暮らしに近いテーマ/)).toBeVisible();
    expect(screen.getByText("教育")).toBeVisible();
    expect(screen.getByText("子育て")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /予算マップを開く/ })
    ).toHaveAttribute("href", "/budget");
    expect(
      screen.getByRole("img", {
        name: "令和8年度当初予算 世田谷区の予算マップ",
      })
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /公式分類で見る/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /予算ページを見る/ })
    ).not.toBeInTheDocument();
  });
});
