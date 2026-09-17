import { describe, expect, it } from "vitest";
import { GENDER_EQUALITY_QUESTIONS } from "./campaign";

describe("第三次男女共同参画プラン素案AIインタビューの固定質問", () => {
  it("素案の具体的な前提を含む7段階を順番どおり保持する", () => {
    expect(GENDER_EQUALITY_QUESTIONS).toHaveLength(7);
    expect(GENDER_EQUALITY_QUESTIONS.map((question) => question.topic)).toEqual(
      [
        "このプランと、あなたの暮らしとの関わり",
        "特に考えたい取組・論点",
        "経験や身近な場面から見えること",
        "区の目的や取組に、納得できる点・疑問がある点",
        "実施に必要な条件と、成果の確かめ方",
        "計画の記載や、実際の進め方への具体的な要望",
        "区に最も伝えたいこと",
      ]
    );
    expect(GENDER_EQUALITY_QUESTIONS[0].question).toContain(
      "話したくない個人情報を明かす必要はありません"
    );
    expect(GENDER_EQUALITY_QUESTIONS[1].question).toContain(
      "十分に取り上げられていない"
    );
    expect(GENDER_EQUALITY_QUESTIONS[2].question).toContain(
      "被害の詳しい説明は不要"
    );
    expect(GENDER_EQUALITY_QUESTIONS[3].question).toContain(
      "どちらか一方だけでも構いません"
    );
    expect(GENDER_EQUALITY_QUESTIONS[4].question).toContain(
      "職場や地域での対応の変化"
    );
    expect(GENDER_EQUALITY_QUESTIONS[5].question).toContain(
      "変更せずに続けてほしい"
    );
    expect(GENDER_EQUALITY_QUESTIONS[6].question).toContain(
      "うまく一文にまとまらなくても構いません"
    );
  });

  it("センシティブな属性を明かさずに関わりを選べる回答候補を用意する", () => {
    expect(GENDER_EQUALITY_QUESTIONS[0].quickReplies).toEqual([
      "暮らしや家族との関わりから",
      "仕事・学校・地域活動との関わりから",
      "支援や相談に関わる立場から",
      "制度や地域社会への関心から",
    ]);
  });
});
