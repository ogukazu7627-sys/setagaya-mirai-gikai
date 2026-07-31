import { afterEach, describe, expect, it, vi } from "vitest";
import { requestBudgetProgramSearch } from "./budget-search-api";

const validResponse = {
  items: [
    {
      datasetId: "11111111-1111-4111-8111-111111111111",
      budgetProgramIdentityId: "bpi_school",
      fiscalYear: 2026,
      accountCode: "general",
      accountName: "一般会計",
      budgetItemKey: "2026_general_expenditure_08_02_06",
      kan: { code: "08", name: "教育費" },
      kou: { code: "02", name: "小学校費" },
      moku: { code: "06", name: "学校施設充実費" },
      displayProgramName: "小学校施設改修工事",
      departmentDisplayName: "教育委員会事務局 教育環境課",
      amountThousandYen: 4_140_518,
      memberGroupCount: 1,
      memberProgramCount: 1,
      relatedRevenueCount: 1,
      hasPublicIdentityResolution: false,
      isZeroAmount: false,
      publishedTopics: [
        {
          slug: "school-facility-aging",
          name: "学校施設の老朽化への対応",
        },
      ],
      score: 1,
      matchedField: "display_program_name",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

describe("requestBudgetProgramSearch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("既存の検索APIへ検索語と匿名IDを送り、型検証した結果を返す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(validResponse), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(
      requestBudgetProgramSearch(
        {
          installationId: "22222222-2222-4222-8222-222222222222",
          query: "学校 改修",
          page: 2,
        },
        controller.signal
      )
    ).resolves.toEqual(validResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/budget/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          installationId: "22222222-2222-4222-8222-222222222222",
          query: "学校 改修",
          page: 2,
        }),
        signal: controller.signal,
      })
    );
  });

  it("HTTPエラーや不正なレスポンスを成功扱いしない", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...validResponse, total: -1 }), {
          status: 200,
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestBudgetProgramSearch({
        installationId: "22222222-2222-4222-8222-222222222222",
        query: "学校",
      })
    ).rejects.toThrow("Budget search request failed");
    await expect(
      requestBudgetProgramSearch({
        installationId: "22222222-2222-4222-8222-222222222222",
        query: "学校",
      })
    ).rejects.toThrow("Budget search returned an invalid response");
  });
});
