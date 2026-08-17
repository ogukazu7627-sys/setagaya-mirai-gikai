import { describe, expect, it } from "vitest";
import {
  buildBudgetQuestionOverview,
  formatBudgetQuestionCouncilorLabel,
} from "./budget-question-overview";

describe("buildBudgetQuestionOverview", () => {
  it("議員の敬称を重複させない", () => {
    expect(formatBudgetQuestionCouncilorLabel("田中優子")).toBe("田中優子議員");
    expect(formatBudgetQuestionCouncilorLabel("田中優子議員")).toBe(
      "田中優子議員"
    );
  });

  it("会派・議員・質問名から概要を作る", () => {
    expect(
      buildBudgetQuestionOverview({
        councilorDisplayName: "くろだあいこ",
        partyOrGroup: "会派名",
        questionName: "令和8年度当初予算の増加要因について",
      })
    ).toBe(
      "会派名の意見として、くろだあいこ議員が「令和8年度当初予算の増加要因」について質問しました。"
    );
  });

  it("会派情報がない場合は推測しない", () => {
    expect(
      buildBudgetQuestionOverview({
        councilorDisplayName: "いたいひとし議員",
        partyOrGroup: null,
        questionName: "浸水想定区域の避難情報に関する質問。",
      })
    ).toBe(
      "いたいひとし議員が「浸水想定区域の避難情報」について質問しました。"
    );
  });

  it("題名の括弧と末尾記号を整える", () => {
    expect(
      buildBudgetQuestionOverview({
        councilorDisplayName: "田中優子",
        partyOrGroup: "会派",
        questionName: "「学校施設の改修」？",
      })
    ).toBe(
      "会派の意見として、田中優子議員が「学校施設の改修」について質問しました。"
    );
  });

  it("括弧で囲まれた題名の「について」も重複させない", () => {
    expect(
      buildBudgetQuestionOverview({
        councilorDisplayName: "田中優子",
        partyOrGroup: null,
        questionName: "「学校施設の改修」について",
      })
    ).toBe("田中優子議員が「学校施設の改修」について質問しました。");
  });
});
