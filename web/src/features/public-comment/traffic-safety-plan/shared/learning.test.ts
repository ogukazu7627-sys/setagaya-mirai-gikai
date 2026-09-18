import { describe, expect, it } from "vitest";
import { TRAFFIC_SAFETY_PLAN_SOURCES } from "./campaign";
import { TRAFFIC_SAFETY_PLAN_LESSONS } from "./learning";

describe("第12次交通安全計画の学習教材", () => {
  it("6章すべてに解説と正解範囲内のクイズがある", () => {
    expect(TRAFFIC_SAFETY_PLAN_LESSONS).toHaveLength(6);
    for (const lesson of TRAFFIC_SAFETY_PLAN_LESSONS) {
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(3);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
    }
  });

  it("指定された章題とA・B・C形式のクイズを順番どおり表示する", () => {
    expect(TRAFFIC_SAFETY_PLAN_LESSONS.map((lesson) => lesson.title)).toEqual([
      "第１章｜この計画で、何を目指しているの？",
      "第２章｜世田谷区では、どんな事故が起きているの？",
      "第３章｜子どもや高齢者が、安全に歩ける道をどうつくるの？",
      "第４章｜自転車は、ルールと利用環境の両方を変えるの？",
      "第５章｜電動キックボードなどには、どう対応するの？",
      "第６章｜誰が実行し、区民は何を確認できるの？",
    ]);
    expect(
      TRAFFIC_SAFETY_PLAN_LESSONS.map((lesson) =>
        String.fromCharCode(65 + lesson.quiz.correctIndex)
      )
    ).toEqual(["B", "C", "A", "B", "C", "A"]);
    for (const lesson of TRAFFIC_SAFETY_PLAN_LESSONS) {
      expect(lesson.quiz.options.map((option) => option.slice(0, 2))).toEqual([
        "A．",
        "B．",
        "C．",
      ]);
    }
  });

  it("教材の出典IDは登録済みの公式資料だけを参照する", () => {
    const sourceIds = new Set(
      TRAFFIC_SAFETY_PLAN_SOURCES.map((source) => source.id)
    );
    for (const lesson of TRAFFIC_SAFETY_PLAN_LESSONS) {
      for (const section of lesson.sections) {
        for (const ref of section.sourceRefs)
          expect(sourceIds.has(ref)).toBe(true);
      }
      for (const ref of lesson.quiz.sourceRefs)
        expect(sourceIds.has(ref)).toBe(true);
    }
    expect(
      TRAFFIC_SAFETY_PLAN_SOURCES.every((source) => source.kind === "official")
    ).toBe(true);
  });
});
