// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CouncilQuestionNavigator } from "./council-question-navigator";

const navigationMocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMocks.push }),
}));

const items = [
  {
    councilorId: "councilor-a",
    councilorDisplayName: "甲",
    councilorIconUrl: null,
    firstQuestionId: "11111111-1111-4111-8111-111111111111",
    questionCount: 2,
  },
  {
    councilorId: "councilor-b",
    councilorDisplayName: "乙",
    councilorIconUrl: null,
    firstQuestionId: "22222222-2222-4222-8222-222222222222",
    questionCount: 1,
  },
];

describe("CouncilQuestionNavigator", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
  });

  it("一般質問では同じ年・大分類の次の議員へ移動する", () => {
    render(
      <CouncilQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        collection={{ kind: "general", categoryId: "education", year: 2026 }}
        items={items}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "次の議員を見る" }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/bills/questions/2026/education?focus=${items[1].firstQuestionId}`,
      { scroll: false }
    );
    expect(screen.getByText("質問 2件")).toBeVisible();
  });
});
