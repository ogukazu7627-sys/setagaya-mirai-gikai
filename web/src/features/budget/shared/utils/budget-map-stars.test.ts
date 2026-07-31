import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_DESKTOP_STAR_COUNT,
  BUDGET_MAP_MOBILE_STAR_COUNT,
  createBudgetMapStars,
} from "./budget-map-stars";

describe("budget map stars", () => {
  it("同じseedから決定的な200個の星を生成する", () => {
    const first = createBudgetMapStars();
    const second = createBudgetMapStars();

    expect(first).toEqual(second);
    expect(first).toHaveLength(BUDGET_MAP_DESKTOP_STAR_COUNT);
    expect(first.filter((star) => star.twinkles).length).toBeLessThan(24);
  });

  it("座標と表示値を安全な範囲に収める", () => {
    for (const star of createBudgetMapStars()) {
      expect(star.xPercent).toBeGreaterThanOrEqual(0);
      expect(star.xPercent).toBeLessThanOrEqual(100);
      expect(star.yPercent).toBeGreaterThanOrEqual(0);
      expect(star.yPercent).toBeLessThanOrEqual(100);
      expect(star.sizePx).toBeGreaterThanOrEqual(0.8);
      expect(star.sizePx).toBeLessThanOrEqual(2.6);
      expect(star.opacity).toBeGreaterThanOrEqual(0.24);
      expect(star.opacity).toBeLessThanOrEqual(0.82);
    }
  });

  it("mobileで表示する星数を60〜80個に保つ", () => {
    expect(BUDGET_MAP_MOBILE_STAR_COUNT).toBeGreaterThanOrEqual(60);
    expect(BUDGET_MAP_MOBILE_STAR_COUNT).toBeLessThanOrEqual(80);
  });
});
