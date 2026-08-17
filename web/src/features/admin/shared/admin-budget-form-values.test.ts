import { describe, expect, it } from "vitest";
import {
  BUDGET_OVERALL_MAJOR_CATEGORY,
  buildBudgetContentMetadata,
  buildBudgetContentSummary,
} from "./admin-budget-form-values";

describe("admin budget form values", () => {
  it("予算専用の大分類ラベルを定義する", () => {
    expect(BUDGET_OVERALL_MAJOR_CATEGORY).toBe("予算全体");
  });

  it("Markdown本文から概要を作る", () => {
    expect(
      buildBudgetContentSummary(
        "# 歳出全体\n\n[公式資料](https://example.com) を確認する。",
        "令和8年度予算"
      )
    ).toBe("歳出全体 公式資料 を確認する。");
  });

  it("予算の内部タイトルと概要を正式タイトルと本文から補完する", () => {
    expect(
      buildBudgetContentMetadata({
        name: "令和8年度当初予算",
        normalContent: "## normal\n\n区全体の予算を確認する。",
        hardContent: "",
      })
    ).toEqual({
      normalTitle: "令和8年度当初予算",
      normalSummary: "normal 区全体の予算を確認する。",
      hardTitle: null,
      hardSummary: null,
    });
  });

  it("hard本文がある場合はhard側の概要も補完する", () => {
    expect(
      buildBudgetContentMetadata({
        name: "令和8年度当初予算",
        normalContent: "normal",
        hardContent: "### hard\n\n詳しい説明",
      }).hardSummary
    ).toBe("hard 詳しい説明");
  });
});
