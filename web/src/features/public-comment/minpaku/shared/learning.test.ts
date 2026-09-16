import { describe, expect, it } from "vitest";
import {
  MINPAKU_OFFICIAL_INFORMATION_URL,
  MINPAKU_OFFICIAL_SUBMISSION_URL,
  MINPAKU_SOURCES,
} from "./campaign";
import { MINPAKU_LEARNING_REVIEWED_AT, MINPAKU_LESSONS } from "./learning";

describe("民泊の学習教材", () => {
  it("6章が一意なIDを持ち、各章が指定された3択・正解1つで構成される", () => {
    expect(MINPAKU_LESSONS).toHaveLength(6);
    expect(new Set(MINPAKU_LESSONS.map((lesson) => lesson.id)).size).toBe(6);
    expect(MINPAKU_LESSONS.map((lesson) => lesson.quiz.correctIndex)).toEqual([
      2, 0, 1, 2, 1, 2,
    ]);
    for (const lesson of MINPAKU_LESSONS) {
      expect(lesson.quiz.options).toHaveLength(3);
      expect(new Set(lesson.quiz.options).size).toBe(3);
      expect(Number.isInteger(lesson.quiz.correctIndex)).toBe(true);
      expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.correctIndex).toBeLessThan(3);
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.quiz.explanation.trim()).not.toBe("");
    }
  });

  it("すべての本文とクイズに登録済み一次資料の出典と確認日がある", () => {
    expect(MINPAKU_LEARNING_REVIEWED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const sources = new Map<string, string>(
      MINPAKU_SOURCES.map((source) => [source.id, source.url])
    );
    for (const lesson of MINPAKU_LESSONS) {
      for (const item of [...lesson.sections, lesson.quiz]) {
        expect(item.sourceRefs.length).toBeGreaterThan(0);
        for (const sourceRef of item.sourceRefs) {
          expect(sources.has(sourceRef)).toBe(true);
          const url = new URL(sources.get(sourceRef) ?? "");
          expect(url.protocol).toBe("https:");
          expect([
            "www.city.setagaya.lg.jp",
            "www.mlit.go.jp",
            "www.city.shinjuku.lg.jp",
            "www.city.toshima.lg.jp",
            "www.city.suginami.tokyo.jp",
            "hieshimasusumu.com",
          ]).toContain(url.hostname);
        }
      }
    }
  });

  it("他区の制度と議員個人の主張を分け、賛同を正解にしない", () => {
    const comparison = MINPAKU_LESSONS[4];
    expect(comparison.sections[0].body).toContain(
      "まだ施行されたルールではありません"
    );
    expect(comparison.sections[1].body).toContain("2026年12月16日から");
    expect(comparison.sections[2].label).toContain("現行ルール");
    const opinion = MINPAKU_LESSONS[5];
    expect(opinion.sections[1].body).toContain(
      "区民全体の意見を示すものではありません"
    );
    expect(opinion.quiz.explanation).toContain(
      "賛同を求めるものではありません"
    );
    const opinionSources = MINPAKU_SOURCES.filter(
      (source) => source.kind === "opinion"
    );
    expect(opinionSources.map((source) => source.id)).toEqual([
      "hieshima-response",
      "hieshima-opposition",
    ]);
    for (const lesson of MINPAKU_LESSONS) {
      const expectedKind =
        lesson.id === "opposing-views" ? "opinion" : "official";
      for (const item of [...lesson.sections, lesson.quiz]) {
        for (const sourceRef of item.sourceRefs) {
          expect(
            MINPAKU_SOURCES.find((source) => source.id === sourceRef)?.kind
          ).toBe(expectedKind);
        }
      }
    }
  });

  it("資料案内と公式提出先を分け、指定済みの提出先を維持する", () => {
    expect(MINPAKU_OFFICIAL_SUBMISSION_URL).toBe(
      "https://www.city.setagaya.lg.jp/pub-comment/02245/34014.html"
    );
    expect(MINPAKU_OFFICIAL_INFORMATION_URL).toBe(
      "https://www.city.setagaya.lg.jp/02245/35467.html"
    );
    expect(
      MINPAKU_SOURCES.find((source) => source.id === "public-comment-page")?.url
    ).toBe(MINPAKU_OFFICIAL_INFORMATION_URL);
  });
});
