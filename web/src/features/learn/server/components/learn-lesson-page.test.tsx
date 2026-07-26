// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { findLearnLesson } from "../../shared/learn-lessons";
import { LearnLessonPage } from "./learn-lesson-page";

describe("LearnLessonPage", () => {
  const lesson = findLearnLesson("bill-process");

  if (!lesson) {
    throw new Error("テスト対象の教材が見つかりません");
  }

  it("教材本文、3つのポイント、公式情報を表示する", () => {
    render(<LearnLessonPage lesson={lesson} />);

    expect(
      screen.getByRole("heading", { level: 1, name: lesson.title })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "3つのポイント" })
    ).toBeInTheDocument();

    for (const point of lesson.keyPoints) {
      expect(screen.getByText(point)).toBeInTheDocument();
    }
    for (const section of lesson.sections) {
      expect(
        screen.getByRole("heading", { name: section.title })
      ).toBeInTheDocument();
    }
    for (const source of lesson.officialSources) {
      expect(
        screen.getByRole("link", { name: new RegExp(source.title) })
      ).toHaveAttribute("href", source.href);
    }
  });

  it("学ぶ一覧、実例、関連記事へ進める", () => {
    render(<LearnLessonPage lesson={lesson} />);

    expect(screen.getByRole("link", { name: "学ぶへ戻る" })).toHaveAttribute(
      "href",
      "/learn"
    );
    expect(
      screen.getByRole("link", { name: /このサイトで見る/ })
    ).toHaveAttribute("href", lesson.explore.href);

    for (const relatedSlug of lesson.relatedSlugs) {
      const relatedLesson = findLearnLesson(relatedSlug);
      const relatedLink = screen
        .getAllByRole("link")
        .find((link) => link.getAttribute("href") === `/learn/${relatedSlug}`);

      expect(relatedLesson).toBeDefined();
      expect(relatedLink).toHaveTextContent(relatedLesson?.title ?? "");
    }
  });
});
