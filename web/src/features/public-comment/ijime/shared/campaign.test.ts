import { describe, expect, it } from "vitest";
import { IJIME_QUESTIONS } from "./campaign";

describe("いじめ条例AIインタビューの固定質問", () => {
  it("具体的な素案の前提を含む7段階を順番どおり保持する", () => {
    expect(IJIME_QUESTIONS).toHaveLength(7);
    expect(IJIME_QUESTIONS.map((question) => question.topic)).toEqual([
      "この条例のテーマとの関わり",
      "素案の中で、特に考えたい論点",
      "経験や実感から、その論点を掘り下げる",
      "子どもの意向と安全を、実際の対応でどう守るか",
      "学校や教育委員会が、確実に動くための仕組み",
      "条例の文言や、施行後の運用への具体的な提案",
      "この条例について、区に最も伝えたいこと",
    ]);
    expect(IJIME_QUESTIONS[0].question).toContain("区・教育委員会・家庭・地域");
    expect(IJIME_QUESTIONS[1].question).toContain(
      "処罰や責任追及そのものを目的とせず"
    );
    expect(IJIME_QUESTIONS[2].question).toContain("重大事態の調査中にも支援");
    expect(IJIME_QUESTIONS[3].question).toContain(
      "和解や関係の継続を求めるものではない"
    );
    expect(IJIME_QUESTIONS[4].question).toContain(
      "誰が・いつまでに・何をするか"
    );
    expect(IJIME_QUESTIONS[5].question).toContain("合わせて１〜３個");
    expect(IJIME_QUESTIONS[6].question).toContain("あなた自身の言葉");
  });
});
