import { describe, expect, it } from "vitest";
import type { BudgetOverview } from "../types/budget";
import {
  buildBudgetPageOverview,
  buildUnavailableBudgetPageOverview,
  formatBudgetAmount,
  formatBudgetDifference,
  formatJapaneseFiscalYear,
  formatRawThousandYen,
  shortenBudgetDepartmentName,
} from "./budget-page-view";

const activeDataset = {
  id: "00000000-0000-4000-8000-000000000001",
  fiscalYear: 2026,
  budgetType: "initial_budget",
  schemaVersion: "public-budget-v1",
  currencyUnit: "thousand_yen",
  manifestSha256: "a".repeat(64),
  validationStatus: "PASS",
};

const overview: BudgetOverview = {
  activeDataset,
  fiscalYear: 2026,
  accounts: [
    {
      accountCode: "general",
      accountName: "一般会計",
      expenditureAmountThousandYen: 431_353_010,
      revenueAmountThousandYen: 431_353_010,
      identityCount: 1050,
    },
    {
      accountCode: "national_health_insurance",
      accountName: "国民健康保険事業会計",
      expenditureAmountThousandYen: 84_206_905,
      revenueAmountThousandYen: 84_206_905,
      identityCount: 40,
    },
  ],
  expenditureTotalAmountThousandYen: 621_033_664,
  revenueTotalAmountThousandYen: 621_033_664,
  identityCount: 1156,
};

describe("budget page view", () => {
  it("maps the active Supabase overview to the public summary", () => {
    expect(buildBudgetPageOverview(overview)).toEqual({
      title: "令和8年度当初予算",
      loadStatus: "ready",
      accountCount: 2,
      generalAccount: overview.accounts[0],
      expenditureTotalAmountThousandYen: 621_033_664,
      revenueTotalAmountThousandYen: 621_033_664,
      identityCount: 1156,
      validationStatus: "PASS",
      isValidated: true,
    });
  });

  it("does not present zero totals as published data without an active dataset", () => {
    const result = buildBudgetPageOverview({
      ...overview,
      activeDataset: null,
      accounts: [],
      expenditureTotalAmountThousandYen: 0,
      revenueTotalAmountThousandYen: 0,
      identityCount: 0,
    });

    expect(result.loadStatus).toBe("empty");
    expect(result.expenditureTotalAmountThousandYen).toBeNull();
    expect(result.revenueTotalAmountThousandYen).toBeNull();
    expect(result.validationStatus).toBe("当初予算を公開準備中");
  });

  it("does not label a different active budget type as the initial budget", () => {
    const result = buildBudgetPageOverview({
      ...overview,
      activeDataset: {
        ...activeDataset,
        budgetType: "supplementary_budget",
      },
    });

    expect(result).toMatchObject({
      title: "令和8年度当初予算",
      loadStatus: "empty",
      accountCount: 0,
      generalAccount: null,
      expenditureTotalAmountThousandYen: null,
      revenueTotalAmountThousandYen: null,
      identityCount: null,
      validationStatus: "当初予算を公開準備中",
      isValidated: false,
    });
  });

  it("creates a non-fabricated fallback when the overview cannot be loaded", () => {
    expect(buildUnavailableBudgetPageOverview(2026)).toMatchObject({
      title: "令和8年度当初予算",
      loadStatus: "error",
      generalAccount: null,
      validationStatus: "取得できません",
    });
  });

  it("formats fiscal years and thousand-yen amounts for public display", () => {
    expect(formatJapaneseFiscalYear(2026)).toBe("令和8年度");
    expect(formatJapaneseFiscalYear(2018)).toBe("2018年度");
    expect(formatBudgetAmount(621_033_664)).toBe("6,210億3,366万4千円");
    expect(formatBudgetAmount(431_353_010)).toBe("4,313億5,301万円");
    expect(formatBudgetAmount(0)).toBe("0円");
    expect(formatRawThousandYen(621_033_664)).toBe("621,033,664 千円");
    expect(formatBudgetDifference(100)).toBe("+100 千円");
    expect(formatBudgetDifference(-100)).toBe("−100 千円");
    expect(formatBudgetDifference(0)).toBe("0 千円");
  });

  it("rejects amounts outside JavaScript's safe integer range", () => {
    expect(() => formatBudgetAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "予算額が安全整数ではありません"
    );
  });

  it("市民向け正式部署名の末尾をグラフ用に短縮表示する", () => {
    expect(shortenBudgetDepartmentName("教育委員会事務局 教育環境課")).toBe(
      "教育環境課"
    );
    expect(shortenBudgetDepartmentName("財務部")).toBe("財務部");
    expect(shortenBudgetDepartmentName("")).toBe("担当部署表示なし");
  });
});
