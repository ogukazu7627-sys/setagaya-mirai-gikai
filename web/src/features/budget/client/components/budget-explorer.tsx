"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { BUDGET_SEARCH_EVENT_NAMES } from "../../shared/constants/budget";
import { BudgetSearchForm } from "./budget-search-form";

const BudgetNetwork = dynamic(
  () =>
    import("./budget-network").then((module) => ({
      default: module.BudgetNetwork,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="budget-network-loading absolute inset-0"
      />
    ),
  }
);

export function BudgetExplorer() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectTopic = (label: string) => {
    setQuery(label);
    window.dispatchEvent(
      new CustomEvent(BUDGET_SEARCH_EVENT_NAMES.topicSelect, {
        detail: { query: label, source: "topic" },
      })
    );
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <>
      <section
        aria-labelledby="budget-page-title"
        className="budget-network-stage budget-network-space relative isolate overflow-hidden border-b border-budget-space-line"
      >
        <BudgetNetwork onSelectTopic={handleSelectTopic} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-7 sm:px-10 sm:pt-9">
          <p className="text-xs font-bold text-budget-space-eyebrow sm:text-sm">
            世田谷区の令和8年度当初予算
          </p>
          <h1
            id="budget-page-title"
            className="mt-2 text-3xl font-bold text-white sm:text-4xl"
          >
            触れる予算
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-budget-space-copy sm:text-base">
            暮らしに近い入口から、まちのお金をたどってみる。
          </p>
        </div>
      </section>

      <section
        aria-labelledby="budget-search-title"
        className="border-b border-mirai-border bg-white px-4 py-6 sm:px-8 sm:py-8"
      >
        <h2
          id="budget-search-title"
          className="mx-auto mb-4 max-w-3xl text-base font-bold text-mirai-text sm:text-lg"
        >
          気になる分野をタップ、または知りたい予算を検索
        </h2>
        <BudgetSearchForm
          inputRef={inputRef}
          query={query}
          onQueryChange={setQuery}
        />
      </section>
    </>
  );
}
