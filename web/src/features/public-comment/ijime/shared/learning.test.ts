import { describe, expect, it } from "vitest";
import { IJIME_SOURCES } from "./campaign";
import { IJIME_LESSONS } from "./learning";

describe("いじめ条例の学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(IJIME_LESSONS).toHaveLength(6);
    for (const lesson of IJIME_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options.length).toBeGreaterThanOrEqual(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(IJIME_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第１章　なぜ、新たな条例をつくるの？",
      "第２章　子どもが「いじめられた」と言うまで待つの？",
      "第３章　「関係の回復」は、必ず仲直りさせること？",
      "第４章　対応するのは、担任の先生だけ？",
      "第５章　重大な被害が起きたら、調査が終わるまで待つの？",
      "第６章　私立学校の子どもや、転校した子どもは対象外？",
    ]);
    expect(
      IJIME_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "A", "C", "B", "C", "A"]);
    for (const lesson of IJIME_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(IJIME_SOURCES.map((source) => source.id));
    for (const lesson of IJIME_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(IJIME_SOURCES.every((source) => source.kind === "official")).toBe(
      true
    );
  });
});
