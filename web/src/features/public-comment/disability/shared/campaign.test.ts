import { describe, expect, it } from "vitest";
import { DISABILITY_QUESTIONS } from "./campaign";

describe("障害理解・地域共生条例改正AIインタビューの固定質問", () => {
  it("具体的な素案の前提を含む7段階を順番どおり保持する", () => {
    expect(DISABILITY_QUESTIONS).toHaveLength(7);
    expect(DISABILITY_QUESTIONS.map((question) => question.topic)).toEqual([
      "この条例改正のテーマとの関わり",
      "改正素案の中で、特に考えたい論点",
      "経験や実感から、その論点を掘り下げる",
      "本人が決めるための支援を、実際にどう保障するか",
      "区政への参加・参画を、形だけにしない仕組み",
      "条例の文言や、施行後の計画・運用への具体的な提案",
      "この条例改正について、区に最も伝えたいこと",
    ]);
    expect(DISABILITY_QUESTIONS[0].question).toContain(
      "障害・病気の詳しい内容"
    );
    expect(DISABILITY_QUESTIONS[1].question).toContain(
      "具体的な住宅数、人員、予算、検証方法"
    );
    expect(DISABILITY_QUESTIONS[2].question).toContain("制度への希望");
    expect(DISABILITY_QUESTIONS[3].question).toContain("すぐに決めない");
    expect(DISABILITY_QUESTIONS[4].question).toContain(
      "会議の前・当日・終了後"
    );
    expect(DISABILITY_QUESTIONS[5].question).toContain("１〜３個");
    expect(DISABILITY_QUESTIONS[6].question).toContain("あなた自身の言葉");
  });

  it("本人の属性を詳しく聞かずに選べる最初の回答候補を用意する", () => {
    expect(DISABILITY_QUESTIONS[0].quickReplies).toEqual([
      "本人として",
      "家族として",
      "支援・サービスに関わる立場として",
      "区民・事業者として",
    ]);
  });
});
