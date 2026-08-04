import { describe, expect, it } from "vitest";
import { getBudgetOfficialClassificationContext } from "./budget-official-classification";

describe("budget official classification", () => {
  it.each([
    ["education", "教育費", "08"],
    ["child-rearing", "民生費", "03"],
    ["welfare", "民生費", "03"],
    ["urban-development", "土木費", "07"],
    ["disaster-prevention", "総務費", "02"],
    ["administration-finance", "総務費", "02"],
    ["culture-sports", "総務費", "02"],
    ["industry", "産業経済費", "06"],
    ["environment", "環境費", "04"],
    ["daily-life", "総務費", "02"],
  ])("%sを対応する公式款へ接続する", (slug, kanName, kanCode) => {
    expect(getBudgetOfficialClassificationContext(slug)).toEqual({
      label: `公式予算分類「${kanName}」を見る`,
      filters: { accountCode: "general", kanCode },
    });
  });

  it("未知の分野を推測で公式款へ割り当てない", () => {
    expect(getBudgetOfficialClassificationContext("unknown")).toEqual({
      label: "公式予算分類から探す",
      filters: null,
    });
  });
});
