"use client";

import type { Route } from "next";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { routes } from "@/lib/routes";
import type {
  BudgetProgramSearchItem,
  BudgetProgramSearchResult,
} from "../../shared/types/budget";
import type {
  BudgetExplorationData,
  BudgetExplorerStableView,
  BudgetExplorerTransitionTarget,
  BudgetExplorerView,
} from "../../shared/types/budget-exploration";
import {
  getBudgetExplorerAnnouncement,
  resolveBudgetExplorerView,
} from "../../shared/utils/budget-explorer-view";
import { requestBudgetProgramSearch } from "../utils/budget-search-api";
import { getBrowserBudgetSearchInstallationId } from "../utils/budget-search-storage";
import { BudgetSearchForm } from "./budget-search-form";
import { BudgetSearchResults } from "./budget-search-results";

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

type BudgetExplorerProps = {
  exploration: BudgetExplorationData;
};

type SearchStatus = "idle" | "loading" | "success" | "error";

export function BudgetExplorer({ exploration }: BudgetExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResult, setSearchResult] =
    useState<BudgetProgramSearchResult | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [transitionTarget, setTransitionTarget] =
    useState<BudgetExplorerTransitionTarget | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categorySlug = searchParams.get("category");
  const topicSlug = searchParams.get("topic");
  const navigationKey = `${categorySlug ?? ""}:${topicSlug ?? ""}`;
  const lastNavigationKeyRef = useRef(navigationKey);
  const stableView = useMemo(
    () =>
      resolveBudgetExplorerView(exploration, {
        categorySlug,
        topicSlug,
      }),
    [categorySlug, exploration, topicSlug]
  );
  const view: BudgetExplorerView = transitionTarget
    ? {
        kind: "transitioning",
        current: stableView,
        target: transitionTarget,
      }
    : stableView;

  useEffect(() => {
    if (navigationKey !== lastNavigationKeyRef.current) {
      lastNavigationKeyRef.current = navigationKey;
      setTransitionTarget(null);
    }
  }, [navigationKey]);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const handlePopState = () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
      setTransitionTarget(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateWithTransition = useCallback(
    (
      target: BudgetExplorerTransitionTarget,
      href: string,
      options: { replace?: boolean; scroll: boolean } = { scroll: false }
    ) => {
      if (transitionTarget) {
        return;
      }
      setTransitionTarget(target);
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      navigationTimerRef.current = setTimeout(
        () => {
          const navigationOptions = { scroll: options.scroll };
          if (options.replace) {
            router.replace(href as Route, navigationOptions);
            return;
          }
          router.push(href as Route, navigationOptions);
        },
        reduceMotion ? 0 : 220
      );
    },
    [router, transitionTarget]
  );

  const handleSelectCategory = useCallback(
    (slug: string) => {
      const category = exploration.categories.find(
        (candidate) => candidate.slug === slug
      );
      if (!category) {
        return;
      }
      navigateWithTransition(
        { kind: "category", category },
        routes.budgetCategory(category.slug)
      );
    },
    [exploration.categories, navigateWithTransition]
  );

  const handleSelectTopic = useCallback(
    (categorySlugToOpen: string, topicSlugToOpen: string) => {
      const category = exploration.categories.find(
        (candidate) => candidate.slug === categorySlugToOpen
      );
      const topic = category?.topics.find(
        (candidate) => candidate.slug === topicSlugToOpen
      );
      if (!category || !topic) {
        return;
      }
      navigateWithTransition(
        { kind: "topic", category, topic },
        routes.budgetTopic(category.slug, topic.slug)
      );
    },
    [exploration.categories, navigateWithTransition]
  );

  const handleSelectProgram = useCallback(
    (budgetProgramIdentityId: string) => {
      navigateWithTransition(
        { kind: "program", budgetProgramIdentityId },
        routes.budgetProgramDetail(budgetProgramIdentityId),
        { scroll: true }
      );
    },
    [navigateWithTransition]
  );

  const handleBack = useCallback(() => {
    if (stableView.kind === "topic") {
      navigateWithTransition(
        { kind: "category", category: stableView.category },
        routes.budgetCategory(stableView.category.slug),
        { replace: true, scroll: false }
      );
      return;
    }
    if (stableView.kind === "category") {
      navigateWithTransition({ kind: "overview" }, routes.budget(), {
        replace: true,
        scroll: false,
      });
    }
  }, [navigateWithTransition, stableView]);

  const focusSearch = useCallback(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    document.getElementById("budget-search-title")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const executeSearch = useCallback(async (normalizedQuery: string) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setSubmittedQuery(normalizedQuery);
    setSearchStatus("loading");
    setSearchResult(null);

    try {
      const result = await requestBudgetProgramSearch(
        {
          installationId: getBrowserBudgetSearchInstallationId(),
          query: normalizedQuery,
        },
        controller.signal
      );
      if (!controller.signal.aborted) {
        setSearchResult(result);
        setSearchStatus("success");
      }
    } catch (error) {
      if (
        !controller.signal.aborted &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setSearchStatus("error");
      }
    }
  }, []);

  const handleSelectSearchResult = useCallback(
    (item: BudgetProgramSearchItem) => {
      handleSelectProgram(item.budgetProgramIdentityId);
    },
    [handleSelectProgram]
  );

  return (
    <>
      <section
        aria-labelledby="budget-page-title"
        className="budget-network-space relative isolate overflow-hidden border-b border-budget-space-line"
      >
        <BudgetNetwork
          exploration={exploration}
          view={view}
          onBack={handleBack}
          onFocusSearch={focusSearch}
          onSelectCategory={handleSelectCategory}
          onSelectProgram={handleSelectProgram}
          onSelectTopic={handleSelectTopic}
        />
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {getBudgetExplorerAnnouncement(stableView)}
        </div>
        <BudgetExplorerHeading view={stableView} />
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
          onSubmitQuery={executeSearch}
        />
        <BudgetSearchResults
          query={submittedQuery}
          result={searchResult}
          status={searchStatus}
          onSelectResult={handleSelectSearchResult}
        />
      </section>
    </>
  );
}

function BudgetExplorerHeading({ view }: { view: BudgetExplorerStableView }) {
  const heading =
    view.kind === "overview"
      ? {
          eyebrow: "世田谷区の令和8年度当初予算",
          title: "触れる予算",
          copy: "暮らしに近い入口から、まちのお金をたどってみる。",
        }
      : view.kind === "category"
        ? {
            eyebrow: "市民目線の探索入口",
            title: view.category.name,
            copy: view.category.shortDescription,
          }
        : {
            eyebrow: `${view.category.name}の課題`,
            title: view.topic.name,
            copy: view.topic.shortDescription,
          };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-7 sm:px-10 sm:pt-9">
      <p className="text-xs font-bold text-budget-space-eyebrow sm:text-sm">
        {heading.eyebrow}
      </p>
      <h1
        id="budget-page-title"
        className="mt-2 max-w-3xl text-3xl font-bold text-white sm:text-4xl"
      >
        {heading.title}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-budget-space-copy sm:text-base">
        {heading.copy}
      </p>
    </div>
  );
}
