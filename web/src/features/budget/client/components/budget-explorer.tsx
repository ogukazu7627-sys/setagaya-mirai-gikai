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
  getBudgetTopicKindLabel,
  resolveBudgetExplorerView,
} from "../../shared/utils/budget-explorer-view";
import { getBudgetMapTransitionDuration } from "../../shared/utils/budget-map-motion";
import {
  BUDGET_MAP_SAMPLE_QUESTION_PARAM,
  getBudgetMapSampleQuestions,
  shouldShowBudgetMapSampleQuestions,
} from "../../shared/utils/budget-map-sample-questions";
import {
  BUDGET_MAP_HOST_VARIANT_PARAM,
  parseBudgetMapVariant,
} from "../../shared/utils/budget-map-variant";
import { getBudgetOfficialClassificationContext } from "../../shared/utils/budget-official-classification";
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

type BudgetExplorerRouteState = {
  categorySlug: string | null;
  topicSlug: string | null;
};

type BudgetExplorerMapTarget = Extract<
  BudgetExplorerTransitionTarget,
  { kind: "overview" | "category" | "topic" }
>;

const BUDGET_SEARCH_WARP_DURATION_MS = 420;

function getBudgetExplorerRouteState(
  target: BudgetExplorerMapTarget
): BudgetExplorerRouteState {
  if (target.kind === "overview") {
    return { categorySlug: null, topicSlug: null };
  }
  if (target.kind === "category") {
    return { categorySlug: target.category.slug, topicSlug: null };
  }
  return {
    categorySlug: target.category.slug,
    topicSlug: target.topic.slug,
  };
}

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
  const searchParamCategorySlug = searchParams.get("category");
  const searchParamTopicSlug = searchParams.get("topic");
  const [routeState, setRouteState] = useState<BudgetExplorerRouteState>(
    () => ({
      categorySlug: searchParamCategorySlug,
      topicSlug: searchParamTopicSlug,
    })
  );
  const { categorySlug, topicSlug } = routeState;
  // 描画層は既定で v2。比較したいときだけ ?mapVariant=v1 を付ける。
  const mapVariant = parseBudgetMapVariant(
    searchParams.get(BUDGET_MAP_HOST_VARIANT_PARAM)
  );
  // 質問衛星の動作確認用データ。実在の議員名と顔写真を使うため、
  // ?questionSample=1 を付けたときだけ出す。
  const showSampleQuestions = shouldShowBudgetMapSampleQuestions(
    searchParams.get(BUDGET_MAP_SAMPLE_QUESTION_PARAM)
  );
  const mapQuestions = useMemo(
    () => getBudgetMapSampleQuestions(showSampleQuestions),
    [showSampleQuestions]
  );
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
    setRouteState((current) =>
      current.categorySlug === searchParamCategorySlug &&
      current.topicSlug === searchParamTopicSlug
        ? current
        : {
            categorySlug: searchParamCategorySlug,
            topicSlug: searchParamTopicSlug,
          }
    );
  }, [searchParamCategorySlug, searchParamTopicSlug]);

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
      const currentUrl = new URL(window.location.href);
      setRouteState({
        categorySlug: currentUrl.searchParams.get("category"),
        topicSlug: currentUrl.searchParams.get("topic"),
      });
      setTransitionTarget(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 動作確認用の質問を出している間は、分野や課題を移動しても
  // 指定が外れないようURLへ持ち回る。
  const keepSampleQuestionParam = useCallback(
    (href: string) => {
      if (!showSampleQuestions) {
        return href;
      }
      const separator = href.includes("?") ? "&" : "?";
      return `${href}${separator}${BUDGET_MAP_SAMPLE_QUESTION_PARAM}=1`;
    },
    [showSampleQuestions]
  );

  const navigateWithTransition = useCallback(
    (
      target: BudgetExplorerTransitionTarget,
      rawHref: string,
      options: { replace?: boolean; scroll: boolean } = { scroll: false }
    ) => {
      const href = keepSampleQuestionParam(rawHref);
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
    [keepSampleQuestionParam, router, transitionTarget]
  );

  // 探索データは親に全件あるため、同一ページの状態変更では
  // Server Componentを再取得せず、iframeを保ったままURL履歴だけ同期する。
  const navigateMapWithTransition = useCallback(
    (
      target: BudgetExplorerMapTarget,
      rawHref: string,
      options: { replace?: boolean } = {}
    ) => {
      const href = keepSampleQuestionParam(rawHref);
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
          const nextRouteState = getBudgetExplorerRouteState(target);
          if (options.replace) {
            window.history.replaceState(null, "", href);
          } else {
            window.history.pushState(null, "", href);
          }
          setRouteState(nextRouteState);
          setTransitionTarget(null);
          navigationTimerRef.current = null;
        },
        reduceMotion ? 0 : getBudgetMapTransitionDuration(target)
      );
    },
    [keepSampleQuestionParam, transitionTarget]
  );

  const handleSelectCategory = useCallback(
    (slug: string) => {
      const category = exploration.categories.find(
        (candidate) => candidate.slug === slug
      );
      if (!category) {
        return;
      }
      navigateMapWithTransition(
        { kind: "category", category },
        routes.budgetCategory(category.slug)
      );
    },
    [exploration.categories, navigateMapWithTransition]
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
      navigateMapWithTransition(
        { kind: "topic", category, topic },
        routes.budgetTopic(category.slug, topic.slug)
      );
    },
    [exploration.categories, navigateMapWithTransition]
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

  // iframe からは questionId だけを受け取り、遷移先はここで組み立てる。
  const handleSelectQuestion = useCallback(
    (questionId: string) => {
      router.push(routes.budgetQuestionDetail(questionId) as Route);
    },
    [router]
  );

  const handleBack = useCallback(() => {
    if (stableView.kind === "topic") {
      navigateMapWithTransition(
        { kind: "category", category: stableView.category },
        routes.budgetCategory(stableView.category.slug),
        { replace: true }
      );
      return;
    }
    if (stableView.kind === "category") {
      navigateMapWithTransition({ kind: "overview" }, routes.budget(), {
        replace: true,
      });
    }
  }, [navigateMapWithTransition, stableView]);

  const openOfficialHierarchy = useCallback(() => {
    const categorySlugToOpen =
      stableView.kind === "overview" ? null : stableView.category.slug;
    const context = getBudgetOfficialClassificationContext(categorySlugToOpen);
    router.push(routes.budgetAll(context.filters ?? undefined), {
      scroll: true,
    });
  }, [router, stableView]);

  const refreshDataset = useCallback(() => {
    router.refresh();
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
            onRefreshDataset={refreshDataset}
            onSelectCategory={handleSelectCategory}
            onSelectProgram={handleSelectProgram}
            onSelectQuestion={handleSelectQuestion}
            onSelectTopic={handleSelectTopic}
            questions={mapQuestions}
            questionSample={showSampleQuestions}
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
            href={routes.budgetAll()}
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
  const heading =
    view.kind === "overview"
      ? {
          eyebrow: "世田谷区の令和8年度当初予算",
          title: "触れる予算",
        }
      : view.kind === "category"
        ? {
            eyebrow: "予算の分野",
            title: view.category.name,
          }
        : {
            eyebrow: `${view.category.name}の${getBudgetTopicKindLabel(view.topic.topicKind)}`,
            title: view.topic.name,
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
    </div>
  );
}
