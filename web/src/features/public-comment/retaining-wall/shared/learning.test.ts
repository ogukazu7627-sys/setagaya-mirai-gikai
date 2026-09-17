import { describe, expect, it } from "vitest";
import { RETAINING_WALL_SOURCES } from "./campaign";
import { RETAINING_WALL_LESSONS } from "./learning";

describe("がけ・擁壁等防災対策方針素案の学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(RETAINING_WALL_LESSONS).toHaveLength(6);
    for (const lesson of RETAINING_WALL_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(RETAINING_WALL_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第１章　何のための方針？――崩れる前に、危険を減らす",
      "第２章　調査で何が分かった？――状態を確かめ、対策につなげる",
      "第３章　なぜ支援を見直す？――制度があっても、工事に進めない",
      "第４章　何を変える？――補助の範囲と、選べる工事を広げる",
      "第５章　工事以外には何をする？――日常の管理と、避難への備えも続ける",
      "第６章　区民は何について意見を出せる？――支援と対策の進め方を考える",
    ]);
    expect(
      RETAINING_WALL_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "C", "A", "B", "C", "A"]);
    for (const lesson of RETAINING_WALL_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(
      RETAINING_WALL_SOURCES.map((source) => source.id)
    );
    for (const lesson of RETAINING_WALL_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(
      RETAINING_WALL_SOURCES.every((source) => source.kind === "official")
    ).toBe(true);
  });
});
