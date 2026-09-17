import { describe, expect, it } from "vitest";
import { RETAINING_WALL_QUESTIONS } from "./campaign";

describe("がけ・擁壁等防災対策方針素案AIインタビューの固定質問", () => {
  it("素案の具体的な前提を含む7段階を順番どおり保持する", () => {
    expect(RETAINING_WALL_QUESTIONS).toHaveLength(7);
    expect(RETAINING_WALL_QUESTIONS.map((question) => question.topic)).toEqual([
      "この方針改定との関わり",
      "素案の中で、特に考えたい論点",
      "安全対策を助けたもの・難しくしたもの",
      "所有者の責任と、周囲の安全をどう両立するか",
      "相談から実際の対策へつなげる仕組み",
      "方針の文言や、改定後の具体策への提案",
      "この方針改定について、区に最も伝えたいこと",
    ]);
    expect(RETAINING_WALL_QUESTIONS[0].question).toContain("正確な住所など");
    expect(RETAINING_WALL_QUESTIONS[1].question).toContain("補助額・補助率");
    expect(RETAINING_WALL_QUESTIONS[2].question).toContain("制度への希望");
    expect(RETAINING_WALL_QUESTIONS[3].question).toContain("公費で支える対象");
    expect(RETAINING_WALL_QUESTIONS[4].question).toContain(
      "誰が・どの段階で・何を支えるか"
    );
    expect(RETAINING_WALL_QUESTIONS[5].question).toContain("１〜３個");
    expect(RETAINING_WALL_QUESTIONS[6].question).toContain("あなた自身の言葉");
  });

  it("場所を特定せずに立場を選べる最初の回答候補を用意する", () => {
    expect(RETAINING_WALL_QUESTIONS[0].quickReplies).toEqual([
      "がけ・擁壁の所有者として",
      "近隣に住む・通行する立場として",
      "建築・防災・施設に関わる立場として",
      "区民・事業者として",
    ]);
  });
});
