// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ESSENTIAL_LESSONS,
  LEARN_LESSONS,
  TOPIC_LESSONS,
} from "../../shared/learn-lessons";
import { LearnPage } from "./learn-page";

describe("LearnPage", () => {
  it("世田谷区議会を学ぶ8本の教材を表示する", () => {
    render(<LearnPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "学ぶ" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "まずはこれだけ" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "テーマから学ぶ" })
    ).toBeInTheDocument();

    for (const lesson of LEARN_LESSONS) {
      expect(
        screen.getByRole("link", { name: new RegExp(lesson.title) })
      ).toHaveAttribute("href", `/learn/${lesson.slug}`);
    }
  });

  it("基礎教材だけに順番を表示する", () => {
    render(<LearnPage />);

    for (const [index] of ESSENTIAL_LESSONS.entries()) {
      expect(screen.getByText(String(index + 1))).toBeInTheDocument();
    }
    expect(TOPIC_LESSONS).toHaveLength(4);
  });

  it("案件・委員会・世田谷区議会公式へ進める", () => {
    render(<LearnPage />);

    expect(screen.getByRole("link", { name: /案件を読む/ })).toHaveAttribute(
      "href",
      "/bills"
    );
    expect(screen.getByRole("link", { name: /委員会を見る/ })).toHaveAttribute(
      "href",
      "/committees"
    );
    expect(
      screen.getByRole("link", { name: /公式情報で確かめる/ })
    ).toHaveAttribute("href", "https://www.city.setagaya.lg.jp/gikai/");
  });
});
