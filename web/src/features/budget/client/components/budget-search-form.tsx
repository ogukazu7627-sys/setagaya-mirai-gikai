"use client";

import { Search } from "lucide-react";
import type { FormEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUDGET_SEARCH_EVENT_NAMES } from "../../shared/constants/budget";

type BudgetSearchFormProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (query: string) => void;
};

export function BudgetSearchForm({
  inputRef,
  query,
  onQueryChange,
}: BudgetSearchFormProps) {
  const handleFocus = () => {
    window.dispatchEvent(
      new CustomEvent(BUDGET_SEARCH_EVENT_NAMES.focus, {
        detail: { query },
      })
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    if (normalizedQuery === "") {
      inputRef.current?.focus();
      return;
    }
    window.dispatchEvent(
      new CustomEvent(BUDGET_SEARCH_EVENT_NAMES.submit, {
        detail: { query: normalizedQuery, source: "form" },
      })
    );
  };

  return (
    <form
      role="search"
      className="mx-auto flex w-full max-w-3xl items-center gap-2"
      onSubmit={handleSubmit}
    >
      <label htmlFor="budget-search" className="sr-only">
        知りたい予算を検索
      </label>
      <Input
        ref={inputRef}
        id="budget-search"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={handleFocus}
        placeholder="例：学校の改築、子育て支援"
        autoComplete="off"
        enterKeyHint="search"
        className="h-12 rounded-md border-mirai-border bg-white px-4 text-base shadow-none focus-visible:border-primary-strong focus-visible:ring-primary/30"
      />
      <Button
        type="submit"
        aria-label="検索"
        className="h-12 rounded-md border-primary-strong px-4 text-mirai-text sm:px-5"
      >
        <Search aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">検索</span>
      </Button>
    </form>
  );
}
