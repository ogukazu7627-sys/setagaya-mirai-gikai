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
      "素案の中で、特に考えたい論点",
      "相談や支援につながるまでの課題",
      "支援を途切れさせない仕組み",
      "周囲の人と支援者が抱え込まないために",
      "計画の実施と評価への具体的な提案",
      "区に最も伝えたいこと",
    ]);
    expect(SUICIDE_PREVENTION_QUESTIONS[0].question).toContain(
      "個人的なつらい経験や医療情報を話す必要はありません"
    );
    expect(SUICIDE_PREVENTION_QUESTIONS[3].question).toContain(
      "本人の同意とプライバシー"
    );
    expect(SUICIDE_PREVENTION_QUESTIONS[5].question).toContain("１〜３個");
  });

  it("固定質問の深掘りで危機や医療情報の告白を求めない", () => {
    expect(SUICIDE_PREVENTION_QUESTIONS[0].followUp).toContain("診断名");
    expect(SUICIDE_PREVENTION_QUESTIONS[2].followUp).toContain(
      "個人的な経験の告白を求めない"
    );
    expect(SUICIDE_PREVENTION_QUESTIONS[4].followUp).toContain(
      "単独での解決責任を負わせない"
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
