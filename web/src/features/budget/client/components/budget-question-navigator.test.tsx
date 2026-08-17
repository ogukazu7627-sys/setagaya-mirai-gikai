// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetQuestionNavigator } from "./budget-question-navigator";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMocks.push }),
}));

const items = [
  {
    councilorId: "councilor-kuroda",
    councilorDisplayName: "くろだあいこ",
    councilorIconUrl: "/icons/councilors/kuroda-aiko.jpg",
    firstQuestionId: "11111111-1111-4111-8111-111111111111",
    questionCount: 2,
  },
  {
    councilorId: "councilor-itai",
    councilorDisplayName: "いたいひとし",
    councilorIconUrl: "/icons/councilors/itai-hitoshi.jpg",
    firstQuestionId: "22222222-2222-4222-8222-222222222222",
    questionCount: 1,
  },
];

describe("BudgetQuestionNavigator", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
  });

  it("現在の議員、件数、前後ボタンを表示する", () => {
    render(
      <BudgetQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        categorySlug="all"
        items={items}
      />
    );

    expect(screen.getByText("くろだあいこ議員")).toBeVisible();
    expect(screen.getByText("質問 2件")).toBeVisible();
    expect(screen.getByText("1 / 2")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "前の議員を見る" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "次の議員を見る" })
    ).toBeEnabled();
  });

  it("前後ボタンで別の議員へ移動する", () => {
    render(
      <BudgetQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        categorySlug="education"
        items={items}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "次の議員を見る" }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/budget/questions/education?focus=${items[1].firstQuestionId}`,
      { scroll: false }
    );
  });

  it("選択メニューから議員へ移動する", () => {
    render(
      <BudgetQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        categorySlug="education"
        items={items}
      />
    );

    fireEvent.change(screen.getByLabelText("議員を選ぶ"), {
      target: { value: items[1].councilorId },
    });

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/budget/questions/education?focus=${items[1].firstQuestionId}`,
      { scroll: false }
    );
  });

  it("議員が1人なら切り替え操作を表示しない", () => {
    render(
      <BudgetQuestionNavigator
        activeCouncilorId={items[0].councilorId}
        categorySlug="education"
        items={[items[0]]}
      />
    );

    expect(screen.queryByLabelText("議員を選ぶ")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "次の議員を見る" })
    ).not.toBeInTheDocument();
  });
});
