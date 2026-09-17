import { describe, expect, it } from "vitest";
import { RETAINING_WALL_QUESTIONS } from "./campaign";

describe("がけ・擁壁等防災対策方針素案AIインタビューの固定質問", () => {
  it("素案の具体的な前提を含む7段階を順番どおり保持する", () => {
    expect(RETAINING_WALL_QUESTIONS).toHaveLength(7);
    expect(RETAINING_WALL_QUESTIONS.map((question) => question.topic)).toEqual([
      "このテーマとの関わり",
      "素案の中で、特に考えたいこと",
      "経験や不安から、具体的な課題を聞く",
      "区の目的や対策内容への納得と、まだ不十分だと思う点",
      "対策の安全性を、どう確かめるか",
      "方針や制度の運用を、具体的にどうしてほしいか",
      "区に最も伝えたいこと",
    ]);
    expect(RETAINING_WALL_QUESTIONS[0].question).toContain(
      "土砂が崩れるのを防ぐ壁"
    );
    expect(RETAINING_WALL_QUESTIONS[0].question).toContain(
      "具体的な住所や個人名"
    );
    expect(RETAINING_WALL_QUESTIONS[1].question).toContain(
      "ここに挙げていないことでも"
    );
    expect(RETAINING_WALL_QUESTIONS[2].question).toContain(
      "直接の経験がない場合"
    );
    expect(RETAINING_WALL_QUESTIONS[3].question).toContain(
      "納得できる点と、まだ不十分だと思う点"
    );
    expect(RETAINING_WALL_QUESTIONS[4].question).toContain(
      "安全性が高まったか、その後も維持されているか"
    );
    expect(RETAINING_WALL_QUESTIONS[5].question).toContain(
      "道路に面しない擁壁への対応"
    );
    expect(RETAINING_WALL_QUESTIONS[5].question).toContain(
      "今の案で続けてほしい点"
    );
    expect(RETAINING_WALL_QUESTIONS[6].question).toContain("あなたの言葉");
  });

  it("場所を特定せずに立場を選べる最初の回答候補を用意する", () => {
    expect(RETAINING_WALL_QUESTIONS[0].quickReplies).toEqual([
      "所有・管理する立場",
      "近くに住む立場",
      "通学・通勤などでそばを通る立場",
      "直接の関わりはないが関心がある",
    ]);
  });
});
