import { describe, expect, it } from "vitest";
import { DEMENTIA_HOPE_PLAN_SOURCES } from "./campaign";
import { DEMENTIA_HOPE_PLAN_LESSONS } from "./learning";

describe("第3期認知症希望計画の学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(DEMENTIA_HOPE_PLAN_LESSONS).toHaveLength(6);
    for (const lesson of DEMENTIA_HOPE_PLAN_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(DEMENTIA_HOPE_PLAN_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第１章｜何のための計画？――本人の意思を大切にしながら、暮らしを支える",
      "第２章｜認知症への見方を変える――知識だけでなく、日常の対応へ",
      "第３章｜本人と一緒に地域をつくる――参加するだけでなく、企画にも関わる",
      "第４章｜「備え」とは？――健康づくりに加え、自分の希望を伝えておく",
      "第５章｜診断の前後をつなぐ――本人にも家族にも、相談と支援を",
      "第６章｜計画の成果をどう確かめる？――評価方法と、まだ決まっていない部分",
    ]);
    expect(
      DEMENTIA_HOPE_PLAN_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "C", "A", "B", "C", "A"]);
    for (const lesson of DEMENTIA_HOPE_PLAN_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(
      DEMENTIA_HOPE_PLAN_SOURCES.map((source) => source.id)
    );
    for (const lesson of DEMENTIA_HOPE_PLAN_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(
      DEMENTIA_HOPE_PLAN_SOURCES.every((source) => source.kind === "official")
    ).toBe(true);
  });
});
