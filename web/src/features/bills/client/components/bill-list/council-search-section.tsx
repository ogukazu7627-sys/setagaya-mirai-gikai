"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FilePenLine,
  Landmark,
  MessageCircleQuestion,
  RotateCcw,
  ScrollText,
  Search,
  X,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RECOMMENDATION_CATEGORY_OPTIONS } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { formatDateWithDots } from "@/lib/utils/date";
import { type BillItemType, getBillItemTypeLabel } from "../../../shared/types";
import type {
  CouncilSearchContentType,
  CouncilSearchDocument,
  CouncilSearchFilters,
  CouncilSearchInitialFilters,
} from "../../../shared/types/council-search";
import {
  COUNCIL_SEARCH_PAGE_SIZE,
  createCouncilSearchFilters,
  hasActiveCouncilSearch,
  searchCouncilDocuments,
} from "../../../shared/utils/council-search";

const CONTENT_TYPE_OPTIONS: Array<{
  value: CouncilSearchContentType;
  label: string;
}> = [
  { value: "all", label: "すべての情報" },
  { value: "bill", label: "議案" },
  { value: "question", label: "質問" },
  { value: "petition", label: "請願・陳情" },
  { value: "report", label: "報告事項" },
  { value: "committee", label: "委員会" },
];

const QUICK_QUERIES = ["子育て", "防災", "道路・交通", "高齢者", "学校"];

type CouncilSearchSectionProps = {
  documents: CouncilSearchDocument[];
  initialFilters?: CouncilSearchInitialFilters;
};

export function CouncilSearchSection({
  documents,
  initialFilters = {},
}: CouncilSearchSectionProps) {
  const themeIds = RECOMMENDATION_CATEGORY_OPTIONS.map(
    (category) => category.id
  );
  const [filters, setFilters] = useState<CouncilSearchFilters>(() =>
    createCouncilSearchFilters(initialFilters, documents, themeIds)
  );
  const [requestedPage, setRequestedPage] = useState(1);

  const committeeNames = useMemo(
    () =>
      documents
        .filter((document) => document.kind === "committee")
        .map((document) => document.name),
    [documents]
  );
  const results = useMemo(
    () => searchCouncilDocuments(documents, filters),
    [documents, filters]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(results.length / COUNCIL_SEARCH_PAGE_SIZE)
  );
  const currentPage = Math.min(requestedPage, totalPages);
  const visibleResults = results.slice(
    (currentPage - 1) * COUNCIL_SEARCH_PAGE_SIZE,
    currentPage * COUNCIL_SEARCH_PAGE_SIZE
  );
  const isSearchActive = hasActiveCouncilSearch(filters);

  useEffect(() => {
    const url = new URL(window.location.href);
    syncSearchParam(url.searchParams, "q", filters.query.trim());
    syncSearchParam(
      url.searchParams,
      "type",
      filters.contentType === "all" ? "" : filters.contentType
    );
    syncSearchParam(url.searchParams, "theme", filters.themeId);
    syncSearchParam(url.searchParams, "committee", filters.committeeName);
    window.history.replaceState(window.history.state, "", url);
  }, [filters]);

  function updateFilters(
    update: (current: CouncilSearchFilters) => CouncilSearchFilters
  ) {
    setFilters(update);
    setRequestedPage(1);
  }

  function resetFilters() {
    setFilters({
      query: "",
      contentType: "all",
      themeId: "",
      committeeName: "",
    });
    setRequestedPage(1);
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

      <div className="mt-5 flex flex-col gap-5">
        <div>
          <label
            htmlFor="council-search-input"
            className="text-sm font-bold text-mirai-text"
          >
            キーワード
          </label>
          <div className="relative mt-2">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mirai-text-secondary"
            />
            <Input
              id="council-search-input"
              type="search"
              value={filters.query}
              onChange={(event) =>
                updateFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder="地名・施設名・制度名など"
              className="h-13 rounded-lg border-mirai-border bg-white pl-12 pr-12 text-base shadow-none"
            />
            {filters.query && (
              <button
                type="button"
                aria-label="キーワードを消去"
                onClick={() =>
                  updateFilters((current) => ({ ...current, query: "" }))
                }
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-mirai-text-secondary hover:bg-mirai-surface-gray hover:text-mirai-text"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-mirai-text-secondary">
            よく探される言葉
          </span>
          {QUICK_QUERIES.map((query) => {
            const isSelected = filters.query === query;
            return (
              <Button
                key={query}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                aria-pressed={isSelected}
                onClick={() =>
                  updateFilters((current) => ({ ...current, query }))
                }
                className="h-8 border-mirai-border px-3 text-xs shadow-none"
              >
                {query}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SearchFilter
            label="情報の種類"
            value={filters.contentType}
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                contentType: value as CouncilSearchContentType,
                themeId: value === "committee" ? "" : current.themeId,
                committeeName:
                  value === "committee" ? "" : current.committeeName,
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
                contentType:
                  current.contentType === "committee"
                    ? "all"
                    : current.contentType,
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
            className="col-span-2 sm:col-span-1"
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                contentType:
                  current.contentType === "committee"
                    ? "all"
                    : current.contentType,
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
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              className="text-mirai-text-secondary"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              条件をクリア
            </Button>
          </div>
        )}
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-mirai-text">
            {isSearchActive ? "検索結果" : "新着の案件"}
          </h3>
          <p
            className="mt-1 text-xs text-mirai-text-secondary"
            aria-live="polite"
          >
            {results.length}件
          </p>
        </div>
      </div>

      {visibleResults.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleResults.map((document) => (
            <li key={`${document.kind}-${document.id}`}>
              <CouncilSearchResultCard document={document} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 border-y border-mirai-border py-10 text-center">
          <Search
            aria-hidden="true"
            className="mx-auto size-7 text-mirai-text-secondary"
          />
          <p className="mt-3 font-bold text-mirai-text">
            条件に合う情報が見つかりませんでした
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resetFilters}
            className="mt-4 border-mirai-border shadow-none"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            条件をクリア
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="議会検索結果のページ"
          className="mt-6 flex items-center justify-center gap-4"
        >
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="前のページ"
            disabled={currentPage === 1}
            onClick={() => setRequestedPage((page) => Math.max(1, page - 1))}
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
            disabled={currentPage === totalPages}
            onClick={() =>
              setRequestedPage((page) => Math.min(totalPages, page + 1))
            }
            className="border-mirai-border shadow-none"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
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

function CouncilSearchResultCard({
  document,
}: {
  document: CouncilSearchDocument;
}) {
  if (document.kind === "committee") {
    return (
      <ResultCard
        href={routes.committeeDetail(document.id) as Route}
        typeLabel="委員会"
        meta={document.committeeKindLabel}
        title={document.name}
        summary={document.summary}
        icon={Landmark}
        visualClassName="bg-teal-100 text-teal-800"
      />
    );
  }

  const visual = getBillResultVisual(document.itemType);

  return (
    <ResultCard
      href={routes.billDetail(document.id) as Route}
      typeLabel={getBillItemTypeLabel(document.itemType as BillItemType)}
      meta={document.majorCategoryLabel}
      date={document.submittedDate}
      title={document.title}
      summary={document.summary}
      footer={document.committeeName}
      thumbnailUrl={document.thumbnailUrl}
      icon={visual.icon}
      visualClassName={visual.className}
    />
  );
}

function ResultCard({
  href,
  typeLabel,
  meta,
  date,
  title,
  summary,
  footer,
  thumbnailUrl,
  icon: Icon,
  visualClassName,
}: {
  href: Route;
  typeLabel: string;
  meta?: string | null;
  date?: string | null;
  title: string;
  summary?: string | null;
  footer?: string | null;
  thumbnailUrl?: string | null;
  icon: LucideIcon;
  visualClassName: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full min-h-44 overflow-hidden rounded-lg border border-mirai-border bg-white transition-colors hover:border-primary-accent hover:bg-mirai-surface-gray focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
    >
      <div
        className={cn(
          "relative flex w-24 shrink-0 flex-col items-center justify-center overflow-hidden sm:w-28",
          visualClassName
        )}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 639px) 96px, 112px"
            className="object-cover"
          />
        ) : (
          <>
            <Icon aria-hidden="true" className="size-8" />
            <span className="mt-2 px-2 text-center text-xs font-bold">
              {typeLabel}
            </span>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{typeLabel}</Badge>
          {meta && (
            <span className="line-clamp-1 text-xs text-mirai-text-secondary">
              {meta}
            </span>
          )}
          {date && (
            <time className="text-xs text-mirai-text-secondary">
              {formatDateWithDots(date)}
            </time>
          )}
        </div>

        <h4 className="mt-2 line-clamp-3 font-bold leading-relaxed text-mirai-text group-hover:text-primary-strong">
          {title}
        </h4>
        {summary && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-mirai-text-secondary">
            {summary}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <p className="line-clamp-1 min-w-0 text-xs font-medium text-mirai-text-secondary">
            {footer}
          </p>
          <ArrowRight
            aria-hidden="true"
            className="size-5 shrink-0 text-primary-accent transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </Link>
  );
}

function getBillResultVisual(itemType: BillItemType): {
  icon: LucideIcon;
  className: string;
} {
  switch (itemType) {
    case "report":
      return {
        icon: ClipboardList,
        className: "bg-emerald-100 text-emerald-800",
      };
    case "petition":
      return {
        icon: FilePenLine,
        className: "bg-amber-100 text-amber-900",
      };
    case "question":
      return {
        icon: MessageCircleQuestion,
        className: "bg-rose-100 text-rose-800",
      };
    default:
      return {
        icon: ScrollText,
        className: "bg-sky-100 text-sky-800",
      };
  }
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
