import { describe, expect, it } from "vitest";
import { GENDER_EQUALITY_SOURCES } from "./campaign";
import { GENDER_EQUALITY_LESSONS } from "./learning";

describe("第三次男女共同参画プラン素案の学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(GENDER_EQUALITY_LESSONS).toHaveLength(6);
    for (const lesson of GENDER_EQUALITY_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(GENDER_EQUALITY_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第１章　何のための計画？――性別に左右されない選択と参加を支える",
      "第２章　働くことと、育児・介護をどう支える？",
      "第３章　暴力や生活の困難に、どう対応する？",
      "第４章　性の多様性と、身体の健康をどう支える？",
      "第５章　担当課だけでなく、区役所全体の仕事を見直す",
      "第６章　取組の成果をどう確かめ、区民の意見を届ける？",
    ]);
    expect(
      GENDER_EQUALITY_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "A", "C", "B", "A", "C"]);
    for (const lesson of GENDER_EQUALITY_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(
      GENDER_EQUALITY_SOURCES.map((source) => source.id)
    );
    for (const lesson of GENDER_EQUALITY_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(
      GENDER_EQUALITY_SOURCES.every((source) => source.kind === "official")
    ).toBe(true);
  });
});
