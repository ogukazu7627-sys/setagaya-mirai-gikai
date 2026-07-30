import { describe, expect, it } from "vitest";
import {
  BUDGET_SEARCH_DEFAULT_PAGE_SIZE,
  BUDGET_SEARCH_MAX_PAGE_SIZE,
  BUDGET_SEARCH_MAX_QUERY_LENGTH,
} from "../constants/budget";
import { budgetProgramSearchRequestSchema } from "./budget-search-schema";

const installationId = "11111111-1111-4111-8111-111111111111";

describe("budgetProgramSearchRequestSchema", () => {
  it("省略可能な検索条件へ安全な既定値を設定する", () => {
    expect(
      budgetProgramSearchRequestSchema.parse({
        installationId,
        query: "  子育て  ",
      })
    ).toEqual({
      installationId,
      query: "子育て",
      fiscalYear: null,
      accountCode: null,
      includeZeroAmount: false,
      page: 1,
      pageSize: BUDGET_SEARCH_DEFAULT_PAGE_SIZE,
    });
  });

  it("検索文字数、ページサイズ、会計コードを制限する", () => {
    expect(
      budgetProgramSearchRequestSchema.safeParse({
        installationId,
        query: "予".repeat(BUDGET_SEARCH_MAX_QUERY_LENGTH + 1),
      }).success
    ).toBe(false);
    expect(
      budgetProgramSearchRequestSchema.safeParse({
        installationId,
        query: "予算",
        pageSize: BUDGET_SEARCH_MAX_PAGE_SIZE + 1,
      }).success
    ).toBe(false);
    expect(
      budgetProgramSearchRequestSchema.safeParse({
        installationId,
        query: "予算",
        accountCode: "unknown",
      }).success
    ).toBe(false);
  });
});
