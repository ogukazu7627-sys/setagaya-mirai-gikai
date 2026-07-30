import { afterEach, describe, expect, it, vi } from "vitest";
import type { BudgetOverview } from "../../shared/types/budget";
import { loadBudgetPageOverview } from "./load-budget-page-overview";

const mocks = vi.hoisted(() => ({
  getBudgetOverview: vi.fn(),
}));

vi.mock("../services/budget-query-service", () => ({
  getBudgetOverview: mocks.getBudgetOverview,
}));

const overview: BudgetOverview = {
  activeDataset: {
    id: "00000000-0000-4000-8000-000000000001",
    fiscalYear: 2026,
    budgetType: "initial_budget",
    schemaVersion: "public-budget-v1",
    currencyUnit: "thousand_yen",
    manifestSha256: "a".repeat(64),
    validationStatus: "PASS",
  },
  fiscalYear: 2026,
  accounts: [
    {
      accountCode: "general",
      accountName: "一般会計",
      expenditureAmountThousandYen: 431_353_010,
      revenueAmountThousandYen: 431_353_010,
      identityCount: 1050,
    },
  ],
  expenditureTotalAmountThousandYen: 621_033_664,
  revenueTotalAmountThousandYen: 621_033_664,
  identityCount: 1156,
};

describe("loadBudgetPageOverview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.getBudgetOverview.mockReset();
  });

  it("loads the public fiscal year through the existing query service", async () => {
    mocks.getBudgetOverview.mockResolvedValue(overview);

    await expect(loadBudgetPageOverview()).resolves.toMatchObject({
      title: "令和8年度当初予算",
      loadStatus: "ready",
      validationStatus: "PASS",
    });
    expect(mocks.getBudgetOverview).toHaveBeenCalledOnce();
    expect(mocks.getBudgetOverview).toHaveBeenCalledWith(2026);
  });

  it("returns a stable unavailable state when Supabase cannot be reached", async () => {
    const error = new Error("Supabase unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getBudgetOverview.mockRejectedValue(error);

    await expect(loadBudgetPageOverview()).resolves.toMatchObject({
      title: "令和8年度当初予算",
      loadStatus: "error",
      validationStatus: "取得できません",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[budget] Failed to load the public overview",
      error
    );
  });
});
