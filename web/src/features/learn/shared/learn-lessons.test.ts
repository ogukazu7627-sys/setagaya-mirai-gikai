import { describe, expect, it } from "vitest";
import {
  ESSENTIAL_LESSONS,
  findLearnLesson,
  LEARN_LESSONS,
  TOPIC_LESSONS,
} from "./learn-lessons";

describe("learn lessons", () => {
  it("基礎4本とテーマ別4本を公開する", () => {
    expect(LEARN_LESSONS).toHaveLength(8);
    expect(ESSENTIAL_LESSONS).toHaveLength(4);
    expect(TOPIC_LESSONS).toHaveLength(4);
  });

  it("slug が重複せず、slug から教材を取得できる", () => {
    const slugs = LEARN_LESSONS.map((lesson) => lesson.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const lesson of LEARN_LESSONS) {
      expect(findLearnLesson(lesson.slug)).toBe(lesson);
    }
  });

  it("関連記事が公開教材を参照する", () => {
    const slugs = new Set(LEARN_LESSONS.map((lesson) => lesson.slug));

    for (const lesson of LEARN_LESSONS) {
      expect(lesson.relatedSlugs).toHaveLength(2);
      for (const relatedSlug of lesson.relatedSlugs) {
        expect(slugs.has(relatedSlug)).toBe(true);
        expect(relatedSlug).not.toBe(lesson.slug);
      }
    }
  });

  it("すべての教材に公式情報と内部の実例導線がある", () => {
    for (const lesson of LEARN_LESSONS) {
      expect(lesson.officialSources.length).toBeGreaterThan(0);
      expect(lesson.explore.href).toMatch(/^\//);

      for (const source of lesson.officialSources) {
        expect(source.href).toMatch(/^https:\/\/www\.city\.setagaya\.lg\.jp\//);
      }
    }
  });
});
