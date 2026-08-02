import { describe, expect, it } from "vitest";
import { getBudgetOfficialClassificationContext } from "./budget-official-classification";

describe("budget official classification", () => {
  it("教育だけを確認済みの公式款へ接続する", () => {
    expect(getBudgetOfficialClassificationContext("education")).toEqual({
      label: "公式予算分類「教育費」を見る",
      filters: { accountCode: "general", kanCode: "08" },
    });
  });

  it("未確認の市民分類を推測で公式款へ割り当てない", () => {
    expect(getBudgetOfficialClassificationContext("daily-life")).toEqual({
      label: "公式予算分類から探す",
      filters: null,
    });
  });
});
