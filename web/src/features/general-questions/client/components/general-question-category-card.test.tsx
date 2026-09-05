// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { GeneralQuestionCategoryCard } from "./general-question-category-card";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("GeneralQuestionCategoryCard", () => {
  it("大分類の質問数と集約先を大きな1枚のカードで示す", () => {
    render(
      <GeneralQuestionCategoryCard
        category={{
          categoryId: "education",
          name: "教育",
          majorCategory: "教育🏫",
          description: "学校、教育環境、学びの支援",
          year: 2026,
          dietSession: {
            id: "session-1",
            name: "令和8年第1回定例会",
            slug: "2026-1",
            startDate: "2026-02-01",
          },
          questionCount: 30,
          latestSubmittedDate: "2026-02-20",
          focusBillId: "11111111-1111-4111-8111-111111111111",
        }}
      />
    );

    expect(
      screen.getByRole("link", { name: /教育に関する議員の質問/u })
    ).toHaveAttribute(
      "href",
      "/bills/questions/2026/education/2026-1?focus=11111111-1111-4111-8111-111111111111"
    );
    expect(screen.getByText("質問 30件")).toBeVisible();
    expect(screen.getByText("令和8年第1回定例会の一般質問")).toBeVisible();
  });
});
