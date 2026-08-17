// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetQuestionNavigator } from "./budget-question-navigator";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMocks.push }),
}));

const items = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    councilorDisplayName: "くろだあいこ",
    councilorIconUrl: "/icons/councilors/kuroda-aiko.jpg",
    questionName: "予算規模について",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    councilorDisplayName: "いたいひとし",
    councilorIconUrl: "/icons/councilors/itai-hitoshi.jpg",
    questionName: "防災情報について",
  },
];

describe("BudgetQuestionNavigator", () => {
  it("現在の議員、件数、前後ボタンを表示する", () => {
    render(
      <BudgetQuestionNavigator
        activeQuestionId={items[0].id}
        categorySlug="all"
        items={items}
      />
    );

    expect(screen.getByText("くろだあいこ議員")).toBeVisible();
    expect(screen.getByText("1 / 2")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "前の議員の質問を見る" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "次の議員の質問を見る" })
    ).toBeEnabled();
  });

  it("前後ボタンで別の質問へ移動する", () => {
    render(
      <BudgetQuestionNavigator
        activeQuestionId={items[0].id}
        categorySlug="education"
        items={items}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "次の議員の質問を見る" })
    );

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/budget/questions/education?focus=${items[1].id}`,
      { scroll: false }
    );
  });

  it("選択メニュから議員の質問へ移動する", () => {
    render(
      <BudgetQuestionNavigator
        activeQuestionId={items[0].id}
        categorySlug="education"
        items={items}
      />
    );

    fireEvent.change(screen.getByLabelText("議員・質問を選ぶ"), {
      target: { value: items[1].id },
    });

    expect(navigationMocks.push).toHaveBeenCalledWith(
      `/budget/questions/education?focus=${items[1].id}`,
      { scroll: false }
    );
  });

  it("質問が1件なら切り替え操作を表示しない", () => {
    render(
      <BudgetQuestionNavigator
        activeQuestionId={items[0].id}
        categorySlug="education"
        items={[items[0]]}
      />
    );

    expect(screen.queryByLabelText("議員・質問を選ぶ")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "次の議員の質問を見る" })
    ).not.toBeInTheDocument();
  });
});
