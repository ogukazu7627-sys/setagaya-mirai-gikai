import { describe, expect, it } from "vitest";
import { DISABILITY_SOURCES } from "./campaign";
import { DISABILITY_LESSONS } from "./learning";

describe("障害理解・地域共生条例改正の学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(DISABILITY_LESSONS).toHaveLength(6);
    for (const lesson of DISABILITY_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(DISABILITY_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第１章　「障害への理解」は、気持ちの問題だけではない",
      "第２章　すでにある条例を、なぜ今、改正するの？",
      "第３章　どこで、誰と暮らすかを、本人が選べるようにする",
      "第４章　「代わりに決める」ではなく、「決めるために支える」",
      "第５章　会議に参加し、自分の意見を伝えられるようにする",
      "第６章　条例が変われば、必要な支援はすべて決まるの？",
    ]);
    expect(
      DISABILITY_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "C", "A", "B", "C", "A"]);
    for (const lesson of DISABILITY_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(DISABILITY_SOURCES.map((source) => source.id));
    for (const lesson of DISABILITY_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(
      DISABILITY_SOURCES.every((source) => source.kind === "official")
    ).toBe(true);
  });
});
