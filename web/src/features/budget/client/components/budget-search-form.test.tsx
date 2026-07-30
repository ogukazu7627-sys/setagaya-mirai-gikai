// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { BUDGET_SEARCH_EVENT_NAMES } from "../../shared/constants/budget";
import { BudgetSearchForm } from "./budget-search-form";

function SearchHarness() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <BudgetSearchForm
      inputRef={inputRef}
      query={query}
      onQueryChange={setQuery}
    />
  );
}

describe("BudgetSearchForm", () => {
  it("supports input, focus, and a normalized submit event", async () => {
    const user = userEvent.setup();
    const focusListener = vi.fn();
    const submitListener = vi.fn();
    window.addEventListener(BUDGET_SEARCH_EVENT_NAMES.focus, focusListener);
    window.addEventListener(BUDGET_SEARCH_EVENT_NAMES.submit, submitListener);

    render(<SearchHarness />);
    const input = screen.getByRole("searchbox", {
      name: "知りたい予算を検索",
    });
    await user.click(input);
    await user.type(input, "  学校   改築  ");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(focusListener).toHaveBeenCalledTimes(1);
    expect(submitListener).toHaveBeenCalledTimes(1);
    expect((submitListener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      query: "学校 改築",
      source: "form",
    });

    window.removeEventListener(BUDGET_SEARCH_EVENT_NAMES.focus, focusListener);
    window.removeEventListener(
      BUDGET_SEARCH_EVENT_NAMES.submit,
      submitListener
    );
  });

  it("normalized queryを検索処理へ渡す", async () => {
    const user = userEvent.setup();
    const onSubmitQuery = vi.fn();
    const inputRef = { current: null };
    render(
      <BudgetSearchForm
        inputRef={inputRef}
        query="  学校   改築  "
        onQueryChange={vi.fn()}
        onSubmitQuery={onSubmitQuery}
      />
    );

    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(onSubmitQuery).toHaveBeenCalledWith("学校 改築");
  });

  it("keeps focus in the input instead of submitting an empty query", async () => {
    const user = userEvent.setup();
    const submitListener = vi.fn();
    window.addEventListener(BUDGET_SEARCH_EVENT_NAMES.submit, submitListener);
    render(<SearchHarness />);

    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(submitListener).not.toHaveBeenCalled();
    expect(
      screen.getByRole("searchbox", { name: "知りたい予算を検索" })
    ).toHaveFocus();
    window.removeEventListener(
      BUDGET_SEARCH_EVENT_NAMES.submit,
      submitListener
    );
  });
});
