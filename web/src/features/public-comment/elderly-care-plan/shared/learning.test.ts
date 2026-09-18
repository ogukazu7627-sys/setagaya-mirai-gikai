import { describe, expect, it } from "vitest";
import { ELDERLY_CARE_PLAN_SOURCES } from "./campaign";
import { ELDERLY_CARE_PLAN_LESSONS } from "./learning";

describe("第10期高齢・介護計画の学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(ELDERLY_CARE_PLAN_LESSONS).toHaveLength(6);
    for (const lesson of ELDERLY_CARE_PLAN_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(ELDERLY_CARE_PLAN_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第1章　何のための計画？――高齢期の暮らしを、まとめて考える",
      "第2章　健康づくりと介護予防――体の変化に早く気づき、支援につなぐ",
      "第3章　外出・交流・仕事――自分に合った社会との関わりを増やす",
      "第4章　介護や認知症があっても――本人と家族の生活を支える",
      "第5章　介護を提供する人と事業所――サービスを続けられる条件を整える",
      "第6章　保険料と目標値――「方針」と「確定した内容」を分けて読む",
    ]);
    expect(
      ELDERLY_CARE_PLAN_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "A", "C", "B", "A", "C"]);
    for (const lesson of ELDERLY_CARE_PLAN_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(
      ELDERLY_CARE_PLAN_SOURCES.map((source) => source.id)
    );
    for (const lesson of ELDERLY_CARE_PLAN_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(
      ELDERLY_CARE_PLAN_SOURCES.every((source) => source.kind === "official")
    ).toBe(true);
  });
});
