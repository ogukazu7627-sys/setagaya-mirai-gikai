"use client";

import { BookOpen, Info } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
import { getBudgetMapTransitionDuration } from "../../shared/utils/budget-map-motion";
import {
  BUDGET_MAP_HOST_VARIANT_PARAM,
  parseBudgetMapVariant,
} from "../../shared/utils/budget-map-variant";
import { requestBudgetProgramSearch } from "../utils/budget-search-api";
import { getBrowserBudgetSearchInstallationId } from "../utils/budget-search-storage";
import { BudgetMapIframe } from "./budget-map-iframe";
import { BudgetSearchForm } from "./budget-search-form";
import {
  BudgetSearchResults,
  type BudgetSearchStatus,
} from "./budget-search-results";

type BudgetExplorerProps = {
  exploration: BudgetExplorationData;
};

const BUDGET_SEARCH_WARP_DURATION_MS = 420;

export function BudgetExplorer({ exploration }: BudgetExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<BudgetSearchStatus>("input");
  const [searchResult, setSearchResult] =
    useState<BudgetProgramSearchResult | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedPage, setSubmittedPage] = useState(1);
  const [transitionTarget, setTransitionTarget] =
    useState<BudgetExplorerTransitionTarget | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const networkSectionRef = useRef<HTMLElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categorySlug = searchParams.get("category");
  const topicSlug = searchParams.get("topic");
  // 描画層は既定で v2。比較したいときだけ ?mapVariant=v1 を付ける。
  const mapVariant = parseBudgetMapVariant(
    searchParams.get(BUDGET_MAP_HOST_VARIANT_PARAM)
  );
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
  const mapView: BudgetExplorerView = transitionTarget
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
        reduceMotion ? 0 : getBudgetMapTransitionDuration(target)
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
      const returnContext =
        stableView.kind === "topic"
          ? {
              categorySlug: stableView.category.slug,
              topicSlug: stableView.topic.slug,
            }
          : stableView.kind === "category"
            ? { categorySlug: stableView.category.slug }
            : undefined;
      navigateWithTransition(
        { kind: "program", budgetProgramIdentityId },
        routes.budgetProgramDetail(budgetProgramIdentityId, returnContext),
        { scroll: true }
      );
    },
    [navigateWithTransition, stableView]
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

  const openOfficialHierarchy = useCallback(() => {
    router.push(routes.budgetOfficialHierarchy(), { scroll: true });
  }, [router]);

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

  const executeSearch = useCallback(
    async (normalizedQuery: string, page = 1) => {
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      setSubmittedQuery(normalizedQuery);
      setSubmittedPage(page);
      setSearchStatus("searching");
      setSearchResult(null);
      networkSectionRef.current?.scrollIntoView?.({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
      const warpDelay = reduceMotion
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            setTimeout(resolve, BUDGET_SEARCH_WARP_DURATION_MS);
          });

      try {
        const result = await requestBudgetProgramSearch(
          {
            installationId: getBrowserBudgetSearchInstallationId(),
            query: normalizedQuery,
            page,
          },
          controller.signal
        );
        await warpDelay;
        if (!controller.signal.aborted) {
          setSearchResult(result);
          setSearchStatus(result.items.length > 0 ? "results" : "empty");
        }
      } catch (error) {
        await warpDelay;
        if (
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setSearchStatus("error");
        }
      }
    },
    []
  );

  const resetSearchResults = useCallback(() => {
    requestControllerRef.current?.abort();
    setSearchStatus("input");
    setSearchResult(null);
    setSubmittedQuery("");
    setSubmittedPage(1);
  }, []);

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery);
      if (searchStatus !== "input") {
        resetSearchResults();
      }
    },
    [resetSearchResults, searchStatus]
  );

  const closeSearchResults = useCallback(() => {
    resetSearchResults();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [resetSearchResults]);

  const retrySearch = useCallback(() => {
    if (submittedQuery) {
      void executeSearch(submittedQuery, submittedPage);
    }
  }, [executeSearch, submittedPage, submittedQuery]);

  const changeSearchPage = useCallback(
    (page: number) => {
      if (submittedQuery) {
        void executeSearch(submittedQuery, page);
      }
    },
    [executeSearch, submittedQuery]
  );

  const handleSelectSearchResult = useCallback(
    (item: BudgetProgramSearchItem) => {
      handleSelectProgram(item.budgetProgramIdentityId);
    },
    [handleSelectProgram]
  );

  return (
    <>
      <section
        ref={networkSectionRef}
        aria-labelledby="budget-page-title"
        className="budget-network-space relative isolate overflow-hidden border-b border-budget-space-line"
      >
        <div
          className="contents"
          aria-hidden={searchStatus === "input" ? undefined : true}
          inert={searchStatus === "input" ? undefined : true}
        >
          <BudgetMapIframe
            exploration={exploration}
            variant={mapVariant}
            view={mapView}
            onBack={handleBack}
            onFocusSearch={focusSearch}
            onOpenOfficialHierarchy={openOfficialHierarchy}
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
        </div>
        <BudgetSearchResults
          query={submittedQuery}
          result={searchResult}
          status={searchStatus}
          onClose={closeSearchResults}
          onPageChange={changeSearchPage}
          onRetry={retrySearch}
          onSelectResult={handleSelectSearchResult}
        />
      </section>

      <section
        aria-labelledby="budget-search-title"
        data-search-state={searchStatus}
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
          isSearching={searchStatus === "searching"}
          query={query}
          onQueryChange={handleQueryChange}
          onSubmitQuery={executeSearch}
        />
        <div className="mx-auto mt-4 flex max-w-3xl flex-col items-start gap-2 text-xs leading-5 text-mirai-text/70 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              当初予算であり実支出ではありません。線・光・大きさはお金の流れや良し悪しを示さず、個別事業の財源配分額・節別内訳は公開資料から確認できません。
            </span>
          </p>
          <Link
            href={routes.budgetOfficialHierarchy()}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            公式分類から探す
          </Link>
        </div>
      </section>
    </>
  );
}

function BudgetExplorerHeading({ view }: { view: BudgetExplorerStableView }) {
  // overview は説明文を持たない2行構成にする。分野が円周状に並ぶため、
  // 3行目まで置くと上側の分野ラベルとぶつかる。
  const heading =
    view.kind === "overview"
      ? {
          eyebrow: "世田谷区の令和8年度当初予算",
          title: "触れる予算",
          copy: null,
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
      {heading.copy && (
        <p className="mt-2 max-w-xl text-sm leading-6 text-budget-space-copy sm:text-base">
          {heading.copy}
        </p>
      )}
    </div>
  );
}
