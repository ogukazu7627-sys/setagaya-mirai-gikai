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
