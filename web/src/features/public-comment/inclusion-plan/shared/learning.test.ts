import { describe, expect, it } from "vitest";
import { INCLUSION_PLAN_SOURCES } from "./campaign";
import { INCLUSION_PLAN_LESSONS } from "./learning";

describe("次期せたがやインクルージョンプランの学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(INCLUSION_PLAN_LESSONS).toHaveLength(6);
    for (const lesson of INCLUSION_PLAN_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(INCLUSION_PLAN_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第１章｜何のための計画？――暮らし全体を支える３年間の方針",
      "第２章｜誰が暮らし方を決める？――本人の意思と権利を支える",
      "第３章｜地域で暮らし続けるには？――住まい・緊急時対応・家族支援をつなぐ",
      "第４章｜学びや仕事はどう変える？――成長に合わせて選択肢を広げる",
      "第５章｜情報や防災はどうする？――「届ける」と「伝えられる」を両方支える",
      "第６章｜実現できるか、どう確かめる？――担い手と具体的な目標を見る",
    ]);
    expect(
      INCLUSION_PLAN_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "C", "A", "B", "C", "A"]);
    for (const lesson of INCLUSION_PLAN_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(
      INCLUSION_PLAN_SOURCES.map((source) => source.id)
    );
    for (const lesson of INCLUSION_PLAN_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(
      INCLUSION_PLAN_SOURCES.every((source) => source.kind === "official")
    ).toBe(true);
  });
});
