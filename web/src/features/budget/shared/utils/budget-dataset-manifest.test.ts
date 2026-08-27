import { describe, expect, it } from "vitest";
import { getBudgetManifestExpenditureTotal } from "./budget-dataset-manifest";

describe("getBudgetManifestExpenditureTotal", () => {
  it("public manifestの歳出総額を取得する", () => {
    expect(
      getBudgetManifestExpenditureTotal({
        totals: { expenditureTotalAmountThousandYen: 621_033_664 },
      })
    ).toBe(621_033_664);
  });

  it.each([
    null,
    [],
    {},
    { totals: null },
    { totals: { expenditureTotalAmountThousandYen: "621033664" } },
    { totals: { expenditureTotalAmountThousandYen: -1 } },
    {
      totals: {
        expenditureTotalAmountThousandYen: Number.MAX_SAFE_INTEGER + 1,
      },
    },
  ])("不正または未設定の値は公開しない", (manifest) => {
    expect(getBudgetManifestExpenditureTotal(manifest)).toBeNull();
  });
});
