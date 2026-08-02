import { describe, expect, it } from "vitest";
import type { BudgetDirectoryHierarchyEntry } from "../types/budget";
import {
  createBudgetDirectorySelection,
  getBudgetHierarchyFilterOptions,
  parseBudgetDirectorySearchParams,
} from "./budget-directory";

const hierarchy: BudgetDirectoryHierarchyEntry[] = [
  {
    accountCode: "general",
    accountName: "一般会計",
    kan: { code: "08", name: "教育費" },
    kou: { code: "02", name: "小学校費" },
    moku: { code: "01", name: "学校管理費" },
    itemKey: "item-1",
  },
  {
    accountCode: "general",
    accountName: "一般会計",
    kan: { code: "08", name: "教育費" },
    kou: { code: "03", name: "中学校費" },
    moku: { code: "01", name: "学校管理費" },
    itemKey: "item-2",
  },
  {
    accountCode: "national_health_insurance",
    accountName: "国民健康保険事業会計",
    kan: { code: "21", name: "総務費" },
    kou: { code: "01", name: "総務管理費" },
    moku: { code: "01", name: "一般管理費" },
    itemKey: "item-3",
  },
];

describe("budget directory", () => {
  it("URL入力を安全に正規化し、親階層がなければ子階層を無視する", () => {
    expect(
      parseBudgetDirectorySearchParams({
        account: "general",
        kan: "08",
        kou: "02",
        moku: "01",
        includeZeroAmount: "true",
        sort: "name_asc",
        page: "3",
      })
    ).toEqual({
      accountCode: "general",
      kanCode: "08",
      kouCode: "02",
      mokuCode: "01",
      includeZeroAmount: true,
      sort: "name_asc",
      page: 3,
    });

    expect(
      parseBudgetDirectorySearchParams({
        account: "unknown",
        kan: "08",
        kou: "02",
        moku: "01",
        includeZeroAmount: "1",
        sort: "unknown",
        page: "-1",
      })
    ).toEqual({
      accountCode: null,
      kanCode: null,
      kouCode: null,
      mokuCode: null,
      includeZeroAmount: false,
      sort: "amount_desc",
      page: 1,
    });
  });

  it("選択中の親階層に属する候補だけを返す", () => {
    expect(
      getBudgetHierarchyFilterOptions(hierarchy, {
        accountCode: "general",
        kanCode: "08",
        kouCode: "02",
      })
    ).toEqual({
      accounts: [
        { code: "general", name: "一般会計" },
        {
          code: "national_health_insurance",
          name: "国民健康保険事業会計",
        },
      ],
      kans: [{ code: "08", name: "教育費" }],
      kous: [
        { code: "02", name: "小学校費" },
        { code: "03", name: "中学校費" },
      ],
      mokus: [{ code: "01", name: "学校管理費" }],
    });
  });

  it("取得条件の既定値と上限を固定する", () => {
    expect(
      createBudgetDirectorySelection({}, { fiscalYear: 2026, pageSize: 24 })
    ).toEqual({
      fiscalYear: 2026,
      accountCode: null,
      kanCode: null,
      kouCode: null,
      mokuCode: null,
      includeZeroAmount: false,
      sort: "amount_desc",
      page: 1,
      pageSize: 24,
    });

    expect(() =>
      createBudgetDirectorySelection(
        { pageSize: 51 },
        { fiscalYear: 2026, pageSize: 24 }
      )
    ).toThrow();
  });
});
