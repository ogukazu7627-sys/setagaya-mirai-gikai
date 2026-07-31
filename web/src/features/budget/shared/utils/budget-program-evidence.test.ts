import { describe, expect, it } from "vitest";
import { describeBudgetProgramEvidenceFields } from "./budget-program-evidence";

describe("describeBudgetProgramEvidenceFields", () => {
  it("表示を許可した公式項目だけを読みやすい根拠へ変換する", () => {
    expect(
      describeBudgetProgramEvidenceFields({
        identity_fields: {
          display_program_name: "小学校施設改修工事",
          hierarchy: ["教育費", "小学校費", "学校施設充実費"],
          department_display_name: "教育委員会事務局 教育環境課",
        },
        member_programs: [
          { detail_program_name: "校舎改修" },
          { budget_program_name: "設備改修" },
        ],
        same_budget_item_other_program_names: ["学校施設改修事務"],
        related_revenues: [{ revenue_detail_id: "revenue-1" }],
        editorial_note: "公開画面へ出さない監査メモ",
      })
    ).toEqual([
      "事業名：小学校施設改修工事",
      "公式予算分類：教育費 > 小学校費 > 学校施設充実費",
      "担当部署：教育委員会事務局 教育環境課",
      "内部の事業明細：校舎改修、設備改修",
      "同じ目の他事業：学校施設改修事務",
      "関連歳入の記載：1件",
    ]);
  });

  it("不正または未知の構造を推測して表示しない", () => {
    expect(describeBudgetProgramEvidenceFields(null)).toEqual([]);
    expect(
      describeBudgetProgramEvidenceFields({
        identity_fields: "unexpected",
        member_programs: [{ unknown_name: "推測しない" }],
      })
    ).toEqual([]);
  });
});
