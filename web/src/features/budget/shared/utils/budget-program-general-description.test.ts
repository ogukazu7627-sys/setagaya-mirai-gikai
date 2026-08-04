import { describe, expect, it } from "vitest";
import { buildBudgetProgramGeneralDescription } from "./budget-program-general-description";

const baseProgram = {
  displayProgramName: "小学校施設改修工事",
};

describe("buildBudgetProgramGeneralDescription", () => {
  it.each([
    [
      "小学校施設改修工事",
      "小学校の校舎や設備の劣化・不具合を改修し、安全に使い続けられる状態に整える",
    ],
    [
      "児童手当支給",
      "子どもを養育する家庭に、子どもの年齢や人数に応じた児童手当を支給する",
    ],
    [
      "生活保護法に基づく保護費",
      "生活、住宅、医療、介護などの扶助費を支給する",
    ],
    ["橋梁点検", "橋のひび割れ、腐食、変形などを定期的に調べ"],
    [
      "乳児期家庭（新生児）訪問事業",
      "助産師や保健師等が訪問し、赤ちゃんの発育、保護者の健康、育児の相談・支援を行う",
    ],
  ])("事業ごとに具体的な用途説明を返す: %s", (name, expected) => {
    const description = buildBudgetProgramGeneralDescription({
      ...baseProgram,
      displayProgramName: name,
    });

    expect(description).toContain(expected);
  });

  it("未整備の事業は用途を推測せず説明準備中と伝える", () => {
    const description = buildBudgetProgramGeneralDescription({
      displayProgramName: "将来追加される未登録事業",
    });

    expect(description).toContain("一般的な説明は現在準備中です");
    expect(description).not.toContain("事業名に示された行政上の取組");
    expect(description).not.toContain("行政サービスや取組を継続して運営、実施");
  });

  it("全ての説明に一般説明であることと公式確認の案内を含める", () => {
    const description = buildBudgetProgramGeneralDescription(baseProgram);

    expect(description).toContain("は一般的には");
    expect(description).toContain("ことに使われる予算です");
    expect(description).toContain(
      "具体的な対象や実施内容はこの表示だけでは確定できません。"
    );
    expect(description).toContain(
      "公式情報は区の公式サイト等でご確認ください。"
    );
  });
});
