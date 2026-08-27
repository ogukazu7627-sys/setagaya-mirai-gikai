"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RECOMMENDATION_CATEGORY_OPTIONS,
  type RecommendationCategoryId,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { cn } from "@/lib/utils";
import type {
  CouncilBillCardPage,
  CouncilDirectoryItem,
} from "../../../shared/types/council-bill-directory";
import type {
  CouncilSearchContentType,
  CouncilSearchFilters,
  CouncilSearchInitialFilters,
} from "../../../shared/types/council-search";
import {
  COUNCIL_SEARCH_PAGE_SIZE,
  createCouncilSearchFilters,
  hasActiveCouncilSearch,
} from "../../../shared/utils/council-search";
import { applyCouncilSearchPageParam } from "../../../shared/utils/council-search-page-param";
import { requestCouncilAiSearch } from "../../utils/council-ai-search-api";
import { getBrowserCouncilSearchInstallationId } from "../../utils/council-ai-search-storage";
import { requestCouncilBillPage } from "../../utils/council-bill-page-api";
import {
  CouncilDirectoryItemCard,
  getCouncilDirectoryItemKey,
} from "./council-directory-item-card";

const CONTENT_TYPE_OPTIONS: Array<{
  value: CouncilSearchContentType;
  label: string;
}> = [
  { value: "all", label: "すべての情報" },
  { value: "bill", label: "議案" },
  { value: "question", label: "質問" },
  { value: "petition", label: "請願・陳情" },
  { value: "report", label: "報告事項" },
];

const QUICK_QUERIES = ["防災", "子育て世代が知っておくべきこと"] as const;
const SEARCH_SKELETON_KEYS = [
  "search-skeleton-1",
  "search-skeleton-2",
  "search-skeleton-3",
  "search-skeleton-4",
  "search-skeleton-5",
] as const;

type SearchStatus = "idle" | "loading" | "success" | "error";
type SearchResult =
  | {
      kind: "ai";
      items: CouncilDirectoryItem[];
      total: number;
    }
  | {
      kind: "filters";
      page: CouncilBillCardPage;
    };

type CouncilSearchSectionProps = {
  committeeNames: string[];
  initialFilters?: CouncilSearchInitialFilters;
  initialPage?: number;
};

export function CouncilSearchSection({
  committeeNames,
  initialFilters = {},
  initialPage = 1,
}: CouncilSearchSectionProps) {
  const themeIds = RECOMMENDATION_CATEGORY_OPTIONS.map(
    (category) => category.id
  );
  const [filters, setFilters] = useState<CouncilSearchFilters>(() =>
    createCouncilSearchFilters(initialFilters, committeeNames, themeIds)
  );
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [requestedPage, setRequestedPage] = useState(initialPage);
  const requestControllerRef = useRef<AbortController | null>(null);
  const initialFiltersRef = useRef(filters);
  const initialPageRef = useRef(initialPage);

  const executeSearch = useCallback(
    async (query: string, searchFilters: CouncilSearchFilters, page = 1) => {
      const normalizedQuery = query.trim();
      requestControllerRef.current?.abort();
      if (!normalizedQuery && !hasActiveCouncilSearch(searchFilters)) {
        setSubmittedQuery("");
        setResult(null);
        setStatus("idle");
        setRequestedPage(1);
        return;
      }

      const controller = new AbortController();
      requestControllerRef.current = controller;
      setSubmittedQuery(normalizedQuery);
      setRequestedPage(page);
      setStatus("loading");

      try {
        const installationId = getBrowserCouncilSearchInstallationId();
        if (normalizedQuery) {
          const response = await requestCouncilAiSearch(
            {
              installationId,
              query: normalizedQuery,
              contentType: searchFilters.contentType,
              themeId: searchFilters.themeId as Parameters<
                typeof requestCouncilAiSearch
              >[0]["themeId"],
              committeeName: searchFilters.committeeName,
            },
            controller.signal
          );
          if (!controller.signal.aborted) {
            setResult({
              kind: "ai",
              items: response.items,
              total: response.total,
            });
            setRequestedPage(1);
            setStatus("success");
          }
          return;
        }

        const response = await requestCouncilBillPage(
          {
            installationId,
            mode: "filters",
            contentType: searchFilters.contentType,
            themeId: searchFilters.themeId as RecommendationCategoryId | "",
            committeeName: searchFilters.committeeName,
            page,
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setResult({ kind: "filters", page: response });
          setRequestedPage(response.currentPage);
          setStatus("success");
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setResult(null);
          setStatus("error");
        }
      }
    },
    []
  );

  useEffect(() => {
    const initialFilters = initialFiltersRef.current;
    if (hasActiveCouncilSearch(initialFilters)) {
      void executeSearch("", initialFilters, initialPageRef.current);
    }
  }, [executeSearch]);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    []
  );

  const aiTotalPages =
    result?.kind === "ai"
      ? Math.max(1, Math.ceil(result.items.length / COUNCIL_SEARCH_PAGE_SIZE))
      : 1;
  const currentPage =
    result?.kind === "filters"
      ? result.page.currentPage
      : Math.min(requestedPage, aiTotalPages);
  const totalPages =
    result?.kind === "filters" ? result.page.totalPages : aiTotalPages;
  const visibleItems =
    result?.kind === "filters"
      ? result.page.items
      : (result?.items.slice(
          (currentPage - 1) * COUNCIL_SEARCH_PAGE_SIZE,
          currentPage * COUNCIL_SEARCH_PAGE_SIZE
        ) ?? []);
  const total =
    result?.kind === "filters" ? result.page.total : (result?.total ?? 0);
  const isSearchActive =
    submittedQuery.length > 0 || hasActiveCouncilSearch(filters);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    syncSearchParam(
      url.searchParams,
      "type",
      filters.contentType === "all" ? "" : filters.contentType
    );
    syncSearchParam(url.searchParams, "theme", filters.themeId);
    syncSearchParam(url.searchParams, "committee", filters.committeeName);
    // リロードや戻る操作でページ番号を失わないようURLへ残す。
    applyCouncilSearchPageParam(url.searchParams, currentPage);
    window.history.replaceState(window.history.state, "", url);
  }, [currentPage, filters]);

  function updateFilters(
    update: (current: CouncilSearchFilters) => CouncilSearchFilters
  ) {
    const nextFilters = update(filters);
    setFilters(nextFilters);
    setRequestedPage(1);
    if (submittedQuery) {
      void executeSearch(submittedQuery, nextFilters);
    } else if (hasActiveCouncilSearch(nextFilters)) {
      void executeSearch("", nextFilters);
    } else {
      requestControllerRef.current?.abort();
      setResult(null);
      setStatus("idle");
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void executeSearch(draftQuery, filters);
  }

  function handleQueryKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function runQuickSearch(query: string) {
    setDraftQuery(query);
    void executeSearch(query, filters);
  }

  function resetSearch() {
    requestControllerRef.current?.abort();
    setDraftQuery("");
    setSubmittedQuery("");
    setResult(null);
    setStatus("idle");
    setFilters({
      contentType: "all",
      themeId: "",
      committeeName: "",
    });
    setRequestedPage(1);
  }

  function changePage(page: number) {
    if (result?.kind === "filters") {
      void executeSearch("", filters, page);
      return;
    }
    setRequestedPage(page);
  }

  function retrySearch() {
    void executeSearch(submittedQuery, filters, currentPage);
  }

  return (
    <section
      id="council-search"
      aria-labelledby="council-search-title"
      className="scroll-mt-24"
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-primary-accent">
          知りたいことから
        </p>
        <h2
          id="council-search-title"
          className="text-[22px] font-bold leading-[1.48] text-mirai-text"
        >
          議会の中を探す
        </h2>
      </div>

      <form
        role="search"
        onSubmit={submitSearch}
        className="mt-5 rounded-lg border border-mirai-border bg-white p-4 sm:p-5"
      >
        <label
          htmlFor="council-ai-search-input"
          className="text-sm font-bold text-mirai-text"
        >
          知りたいことを入力
        </label>
        <div className="border-mirai-gradient relative mt-2 rounded-lg bg-white focus-within:ring-[3px] focus-within:ring-primary/30">
          <Sparkles
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-4 size-5 text-primary-accent"
          />
          <Textarea
            id="council-ai-search-input"
            rows={1}
            maxLength={200}
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            onKeyDown={handleQueryKeyDown}
            placeholder="例：若者が知るべきこと"
            className="max-h-[92px] min-h-13 resize-none border-0 bg-transparent py-3 pl-12 pr-14 text-base leading-6 shadow-none focus-visible:border-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="議会をAI検索"
            title="検索"
            disabled={!draftQuery.trim() || status === "loading"}
            className="absolute bottom-2 right-2 size-9 rounded-md shadow-none"
          >
            <Search aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-mirai-text-secondary">
            入力例
          </span>
          {QUICK_QUERIES.map((query) => (
            <Button
              key={query}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => runQuickSearch(query)}
              className="h-auto min-h-8 whitespace-normal border-mirai-border px-3 py-1.5 text-left text-xs shadow-none"
            >
              {query}
            </Button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-mirai-border pt-5 sm:grid-cols-3">
          <SearchFilter
            label="情報の種類"
            value={filters.contentType}
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                contentType: value as CouncilSearchContentType,
              }))
            }
            options={CONTENT_TYPE_OPTIONS}
          />
          <SearchFilter
            label="テーマ"
            value={filters.themeId || "all"}
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                themeId: value === "all" ? "" : value,
              }))
            }
            options={[
              { value: "all", label: "すべてのテーマ" },
              ...RECOMMENDATION_CATEGORY_OPTIONS.map((category) => ({
                value: category.id,
                label: category.label,
              })),
            ]}
          />
          <SearchFilter
            label="委員会"
            value={filters.committeeName || "all"}
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                committeeName: value === "all" ? "" : value,
              }))
            }
            options={[
              { value: "all", label: "すべての委員会" },
              ...committeeNames.map((name) => ({ value: name, label: name })),
            ]}
          />
        </div>

        {isSearchActive && (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetSearch}
              className="text-mirai-text-secondary"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              条件をクリア
            </Button>
          </div>
        )}
      </form>

      {isSearchActive && (
        <div className="mt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-mirai-text">検索結果</h3>
              {status !== "loading" && status !== "error" && (
                <p
                  className="mt-1 text-xs text-mirai-text-secondary"
                  aria-live="polite"
                >
                  {total}件
                </p>
              )}
            </div>
          </div>

          {status === "loading" ? (
            <CouncilSearchSkeleton />
          ) : status === "error" ? (
            <div
              role="alert"
              className="mt-4 max-w-[634px] border-y border-mirai-border py-10 text-center"
            >
              <p className="font-bold text-mirai-text">
                検索結果を取得できませんでした
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={retrySearch}
                className="mt-4 border-mirai-border shadow-none"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                もう一度試す
              </Button>
            </div>
          ) : visibleItems.length > 0 ? (
            <ul className="mt-4 flex max-w-[634px] flex-col gap-4">
              {visibleItems.map((item) => (
                <li key={getCouncilDirectoryItemKey(item)}>
                  <CouncilDirectoryItemCard item={item} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 max-w-[634px] border-y border-mirai-border py-10 text-center">
              <Search
                aria-hidden="true"
                className="mx-auto size-7 text-mirai-text-secondary"
              />
              <p className="mt-3 font-bold text-mirai-text">
                条件に合う案件が見つかりませんでした
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetSearch}
                className="mt-4 border-mirai-border shadow-none"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                条件をクリア
              </Button>
            </div>
          )}

          {status !== "loading" && status !== "error" && totalPages > 1 && (
            <nav
              aria-label="議会検索結果のページ"
              className="mt-6 flex max-w-[634px] items-center justify-center gap-4"
            >
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="前のページ"
                title="前のページ"
                disabled={currentPage === 1}
                onClick={() => changePage(Math.max(1, currentPage - 1))}
                className="border-mirai-border shadow-none"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span className="min-w-16 text-center text-sm font-bold text-mirai-text">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="次のページ"
                title="次のページ"
                disabled={currentPage === totalPages}
                onClick={() =>
                  changePage(Math.min(totalPages, currentPage + 1))
                }
                className="border-mirai-border shadow-none"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}

function SearchFilter({
  label,
  value,
  onValueChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-2 text-xs font-bold text-mirai-text-secondary",
        className
      )}
    >
      <span>{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-11 w-full min-w-0 appearance-none rounded-md border border-mirai-border bg-white px-3 pr-9 text-sm font-normal text-mirai-text shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-mirai-text-secondary"
        />
      </span>
    </label>
  );
}

function CouncilSearchSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 flex max-w-[634px] flex-col gap-4"
    >
      <span className="sr-only">検索中</span>
      {SEARCH_SKELETON_KEYS.slice(0, COUNCIL_SEARCH_PAGE_SIZE).map((key) => (
        <div
          key={key}
          className="min-h-56 animate-pulse rounded-lg border border-mirai-border bg-white p-6"
        >
          <div className="h-6 w-20 rounded bg-mirai-surface-gray" />
          <div className="mt-5 h-7 w-4/5 rounded bg-mirai-surface-gray" />
          <div className="mt-5 h-4 w-2/5 rounded bg-mirai-surface-gray" />
          <div className="mt-7 h-4 w-full rounded bg-mirai-surface-gray" />
          <div className="mt-3 h-4 w-3/4 rounded bg-mirai-surface-gray" />
        </div>
      ))}
    </div>
  );
}

function syncSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string
) {
  if (value) {
    searchParams.set(key, value);
  } else {
    searchParams.delete(key);
  }
}
