// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BudgetPageOverview } from "../../shared/types/budget-page";
import { BudgetOverviewSection } from "./budget-overview-section";

const readyOverview: BudgetPageOverview = {
  title: "令和8年度当初予算",
  loadStatus: "ready",
  accountCount: 5,
  generalAccount: {
    accountName: "一般会計",
    expenditureAmountThousandYen: 431_353_010,
    revenueAmountThousandYen: 431_353_010,
  },
  expenditureTotalAmountThousandYen: 621_033_664,
  revenueTotalAmountThousandYen: 621_033_664,
  identityCount: 1156,
  validationStatus: "PASS",
  isValidated: true,
};

describe("BudgetOverviewSection", () => {
  it("shows the active initial-budget totals and validation state", () => {
    render(<BudgetOverviewSection overview={readyOverview} />);

    expect(
      screen.getByRole("heading", { name: "令和8年度当初予算" })
    ).toBeVisible();
    expect(screen.getByText("5会計・1156事業")).toBeVisible();
    expect(screen.getAllByText("6,210億3,366万4千円")).toHaveLength(2);
    expect(screen.getByText("検証済み（PASS）")).toBeVisible();
  });

  it("does not fabricate amounts while the initial budget is unavailable", () => {
    render(
      <BudgetOverviewSection
        overview={{
          ...readyOverview,
          loadStatus: "empty",
          accountCount: 0,
          generalAccount: null,
          expenditureTotalAmountThousandYen: null,
          revenueTotalAmountThousandYen: null,
          identityCount: null,
          validationStatus: "当初予算を公開準備中",
          isValidated: false,
        }}
      />
    );

    expect(screen.getByText("公開データ準備中")).toBeVisible();
    expect(screen.getByText("当初予算を公開準備中")).toBeVisible();
    expect(screen.queryByText("6,210億3,366万4千円")).not.toBeInTheDocument();
  });
});
