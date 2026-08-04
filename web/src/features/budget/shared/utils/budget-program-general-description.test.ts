import { describe, expect, it } from "vitest";
import { buildBudgetProgramGeneralDescription } from "./budget-program-general-description";

const baseProgram = {
  displayProgramName: "地域交流事業",
  mokuName: "地域活動費",
};

describe("buildBudgetProgramGeneralDescription", () => {
  it.each([
    ["会計年度任用職員人件費", "給与や手当"],
    ["小学校施設改修工事", "施設や設備の整備、改修、更新"],
    ["公園維持管理", "必要な管理や運営"],
    ["子育て世帯支援", "助成、給付、支援"],
    ["地域交通計画", "現状の調査や計画作成"],
    ["区民施設運営", "行政サービスや取組を継続して運営、実施"],
  ])("事業名の明示語だけで説明を選ぶ: %s", (name, expected) => {
    const description = buildBudgetProgramGeneralDescription({
      ...baseProgram,
      displayProgramName: name,
    });

    expect(description).toContain(expected);
  });

  it("明示語がない場合は公式の目名称を使った共通文にする", () => {
    expect(buildBudgetProgramGeneralDescription(baseProgram)).toContain(
      "「地域活動費」の分野で、事業名に示された行政上の取組"
    );
  });

  it("複数の明示語がある場合は定義済みの優先順位を使う", () => {
    const description = buildBudgetProgramGeneralDescription({
      ...baseProgram,
      displayProgramName: "会計年度任用職員人件費関連施設改修",
    });

    expect(description).toContain("給与や手当");
    expect(description).not.toContain("施設や設備の整備");
  });

  it("全ての説明に一般説明であることと公式確認の案内を含める", () => {
    const description = buildBudgetProgramGeneralDescription(baseProgram);

    expect(description).toContain("は一般的には");
    expect(description).toContain(
      "具体的な対象や実施内容はこの表示だけでは確定できません。"
    );
    expect(description).toContain(
      "公式情報は区の公式サイト等でご確認ください。"
    );
  });
});
