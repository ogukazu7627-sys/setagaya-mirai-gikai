import { describe, expect, it } from "vitest";
import {
  SUICIDE_PREVENTION_CONTEXT,
  SUICIDE_PREVENTION_QUESTIONS,
  SUICIDE_PREVENTION_SOURCES,
} from "./campaign";

describe("自殺対策計画素案AIインタビューの固定設定", () => {
  it("政策意見を段階的に深める7問を保持する", () => {
    expect(SUICIDE_PREVENTION_QUESTIONS).toHaveLength(7);
    expect(
      SUICIDE_PREVENTION_QUESTIONS.map((question) => question.topic)
    ).toEqual([
      "この計画との関わり",
      "特に考えたい取組や論点",
      "経験や期待から見える、支援の受けやすさ",
      "区が示す目的や取組について、納得できる点と不十分な点",
      "支援が実際に届くための条件と、確認の方法",
      "計画や実施方法に、具体的に反映してほしいこと",
      "区に最も伝えたいこと",
    ]);
    expect(SUICIDE_PREVENTION_QUESTIONS[0].question).toContain(
      "直接の経験がなくても、地域の取組への関心から答えて構いません"
    );
    expect(SUICIDE_PREVENTION_QUESTIONS[3].question).toContain(
      "納得できる点と、まだ不十分だと思う点"
    );
    expect(SUICIDE_PREVENTION_QUESTIONS[4].question).toContain(
      "必要な支援が届き、途中で途切れないために"
    );
    expect(SUICIDE_PREVENTION_QUESTIONS[5].question).toContain(
      "現在の取組を維持・継続してほしいという意見でも構いません"
    );
  });

  it("固定質問の深掘りで危機や医療情報の告白を求めない", () => {
    expect(SUICIDE_PREVENTION_QUESTIONS[0].followUp).toContain("診断名");
    expect(SUICIDE_PREVENTION_QUESTIONS[2].followUp).toContain(
      "個人的な経験の告白を求めない"
    );
    expect(SUICIDE_PREVENTION_QUESTIONS[4].followUp).toContain(
      "家族や身近な人だけに責任を負わせない"
    );
  });

  it("素案と現行支援を確認できる公式資料を登録する", () => {
    expect(SUICIDE_PREVENTION_SOURCES.map((source) => source.id)).toContain(
      "mental-health-support"
    );
    expect(SUICIDE_PREVENTION_CONTEXT).toContain("SNS等による相談手段");
    expect(SUICIDE_PREVENTION_CONTEXT).toContain("導入を検討");
    expect(SUICIDE_PREVENTION_CONTEXT).toContain("練馬区の仕組みは比較例");
  });
});
