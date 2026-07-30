// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BUDGET_SEARCH_EVENT_NAMES } from "../../shared/constants/budget";
import { BudgetExplorer } from "./budget-explorer";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockBudgetNetwork({
      onSelectTopic,
    }: {
      onSelectTopic: (label: string) => void;
    }) {
      return (
        <button type="button" onClick={() => onSelectTopic("教育")}>
          教育の予算を探す
        </button>
      );
    },
}));

describe("BudgetExplorer", () => {
  it("moves a selected topic into the search input without running a search", async () => {
    const user = userEvent.setup();
    const topicListener = vi.fn();
    const submitListener = vi.fn();
    window.addEventListener(
      BUDGET_SEARCH_EVENT_NAMES.topicSelect,
      topicListener
    );
    window.addEventListener(BUDGET_SEARCH_EVENT_NAMES.submit, submitListener);

    render(<BudgetExplorer />);
    await user.click(screen.getByRole("button", { name: "教育の予算を探す" }));

    const input = screen.getByRole("searchbox", {
      name: "知りたい予算を検索",
    });
    expect(input).toHaveValue("教育");
    await waitFor(() => expect(input).toHaveFocus());
    expect(topicListener).toHaveBeenCalledTimes(1);
    expect((topicListener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      query: "教育",
      source: "topic",
    });
    expect(submitListener).not.toHaveBeenCalled();

    window.removeEventListener(
      BUDGET_SEARCH_EVENT_NAMES.topicSelect,
      topicListener
    );
    window.removeEventListener(
      BUDGET_SEARCH_EVENT_NAMES.submit,
      submitListener
    );
  });
});
