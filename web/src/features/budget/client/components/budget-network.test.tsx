// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetNetwork } from "./budget-network";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="budget-network-chart">{children}</div>
  ),
  ScatterChart: ({ children }: { children: ReactNode }) => (
    <svg aria-hidden="true">{children}</svg>
  ),
  XAxis: () => null,
  YAxis: () => null,
  ZAxis: () => null,
  ReferenceLine: () => null,
  Scatter: () => null,
}));

describe("BudgetNetwork", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
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
  });

  it("renders only the ten public category labels as interactive nodes", () => {
    render(<BudgetNetwork onSelectTopic={vi.fn()} />);

    expect(
      screen.getByRole("group", {
        name: "予算を10の分野から探すネットワーク",
      })
    ).toBeVisible();
    expect(screen.getByTestId("budget-network-chart")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button").map((button) => button.textContent)
    ).toEqual([
      "教育",
      "子育て",
      "福祉",
      "まちづくり",
      "防災",
      "行財政",
      "文化・スポーツ",
      "産業",
      "環境問題",
      "暮らし",
    ]);
  });

  it("reports the selected category without treating decorations as data", async () => {
    const user = userEvent.setup();
    const onSelectTopic = vi.fn();

    render(<BudgetNetwork onSelectTopic={onSelectTopic} />);
    await user.click(screen.getByRole("button", { name: "教育の予算を探す" }));

    expect(onSelectTopic).toHaveBeenCalledOnce();
    expect(onSelectTopic).toHaveBeenCalledWith("教育");
  });
});
