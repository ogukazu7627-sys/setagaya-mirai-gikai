"use client";

import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  BudgetProgramSearchItem,
  BudgetProgramSearchResult,
} from "../../shared/types/budget";
import { formatBudgetAmount } from "../../shared/utils/budget-page-view";

export type BudgetSearchStatus =
  | "input"
  | "searching"
  | "results"
  | "empty"
  | "error";

type BudgetSearchResultsProps = {
  query: string;
  result: BudgetProgramSearchResult | null;
  status: BudgetSearchStatus;
  onClose: () => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectResult: (item: BudgetProgramSearchItem) => void;
};

export function BudgetSearchResults({
  query,
  result,
  status,
  onClose,
  onPageChange,
  onRetry,
  onSelectResult,
}: BudgetSearchResultsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const items = result?.items ?? [];
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  useEffect(() => {
    if (status === "input") {
      return;
    }
    setActiveIndex(-1);
    panelRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (status === "input") {
      return;
    }
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, status]);

  if (status === "input") {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      items.length === 0 ||
      (event.key !== "ArrowDown" && event.key !== "ArrowUp")
    ) {
      return;
    }

    event.preventDefault();
    const nextIndex =
      event.key === "ArrowDown"
        ? (activeIndex + 1) % items.length
        : activeIndex <= 0
          ? items.length - 1
          : activeIndex - 1;
    setActiveIndex(nextIndex);
    itemRefs.current[nextIndex]?.focus();
  };

  const announcement =
    status === "searching"
      ? "予算事業を検索中です"
      : status === "results"
        ? `${result?.total ?? 0}件の候補が見つかりました`
        : status === "empty"
          ? "一致する予算事業は見つかりませんでした"
          : "予算検索でエラーが発生しました";

  return (
    <div
      id="budget-search-results"
      className={cn(
        "absolute inset-0 z-40 bg-budget-space-deep/95 backdrop-blur-sm",
        status === "searching" && "budget-search-warp"
      )}
      data-search-state={status}
    >
      <div
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 pb-5 pt-6 outline-none sm:px-8 sm:pb-8 sm:pt-8"
        aria-label="予算検索結果"
      >
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </p>

        {status === "searching" ? (
          <SearchLoading />
        ) : (
          <>
            <SearchResultsHeader
              query={query}
              total={status === "results" ? (result?.total ?? 0) : null}
              onClose={onClose}
            />
            {status === "error" && (
              <SearchMessage
                icon={AlertCircle}
                title="検索できませんでした"
                copy="少し待ってから、もう一度お試しください。"
                actionLabel="もう一度検索"
                onAction={onRetry}
              />
            )}
            {status === "empty" && (
              <SearchMessage
                icon={SearchX}
                title="一致する予算事業は見つかりませんでした"
                copy="言葉を短くするか、別の表現で検索してみてください。"
                actionLabel="検索条件を変える"
                onAction={onClose}
              />
            )}
            {status === "results" && (
              <>
                <div className="mt-3 flex justify-end sm:mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="shrink-0 rounded-md border-budget-space-line bg-white text-mirai-text"
                  >
                    <Search aria-hidden="true" className="size-4" />
                    検索条件を変える
                  </Button>
                </div>
                <div
                  role="listbox"
                  aria-label={`${query}の予算事業候補`}
                  className="mt-4 grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto overscroll-contain pb-2 pr-1 sm:grid-cols-2 sm:gap-4"
                >
                  {items.map((item, index) => (
                    <div key={item.budgetProgramIdentityId} role="presentation">
                      <Button
                        ref={(element) => {
                          itemRefs.current[index] = element;
                        }}
                        id={`budget-search-result-${index}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === index}
                        variant="ghost"
                        onFocus={() => setActiveIndex(index)}
                        onClick={() => onSelectResult(item)}
                        className="budget-search-result-card h-full min-h-44 w-full flex-col items-stretch justify-between gap-4 whitespace-normal rounded-md border border-budget-space-line bg-white px-4 py-4 text-left text-mirai-text shadow-lg hover:bg-white hover:text-mirai-text aria-selected:border-budget-node-mint aria-selected:ring-2 aria-selected:ring-budget-node-mint sm:px-5"
                      >
                        <span className="block">
                          <span className="flex items-start justify-between gap-3">
                            <span className="text-base font-bold leading-6">
                              {item.displayProgramName}
                            </span>
                            <ArrowRight
                              aria-hidden="true"
                              className="mt-1 size-4 shrink-0 text-primary-strong"
                            />
                          </span>
                          <span className="mt-2 block text-sm font-bold tabular-nums text-primary-strong">
                            {formatBudgetAmount(item.amountThousandYen)}
                          </span>
                          <span className="mt-2 block text-xs leading-5 text-mirai-text-muted">
                            {item.kan.name} &gt; {item.kou.name} &gt;{" "}
                            {item.moku.name}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-mirai-text-secondary">
                            {item.departmentDisplayName || "担当部署表示なし"}
                          </span>
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          <Badge variant="outline">{item.accountName}</Badge>
                          {item.publishedTopics.map((topic) => (
                            <Badge key={topic.slug} variant="secondary">
                              {topic.name}
                            </Badge>
                          ))}
                        </span>
                      </Button>
                    </div>
                  ))}
                </div>
                {result && totalPages > 1 && (
                  <nav
                    aria-label="検索結果のページ"
                    className="mt-3 flex items-center justify-center gap-3 text-sm text-white"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={result.page <= 1}
                      onClick={() => onPageChange(result.page - 1)}
                      className="rounded-md border border-budget-space-line text-white hover:bg-budget-space-mid hover:text-white disabled:text-budget-space-copy"
                    >
                      <ChevronLeft aria-hidden="true" className="size-4" />
                      前へ
                    </Button>
                    <span className="tabular-nums">
                      {result.page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={result.page >= totalPages}
                      onClick={() => onPageChange(result.page + 1)}
                      className="rounded-md border border-budget-space-line text-white hover:bg-budget-space-mid hover:text-white disabled:text-budget-space-copy"
                    >
                      次へ
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SearchLoading() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center text-center text-white"
      aria-hidden="true"
    >
      <span className="budget-search-warp-core flex size-20 items-center justify-center rounded-full border border-budget-space-line">
        <LoaderCircle className="size-8 animate-spin" />
      </span>
      <p className="mt-5 text-lg font-bold">予算の宇宙を移動しています</p>
      <p className="mt-1 text-sm text-budget-space-copy">
        関連する事業を探しています
      </p>
    </div>
  );
}

function SearchResultsHeader({
  query,
  total,
  onClose,
}: {
  query: string;
  total: number | null;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-bold text-budget-space-eyebrow">
          予算事業の候補
        </p>
        <h2 className="mt-1 break-words text-xl font-bold text-white sm:text-2xl">
          「{query}」
          {total !== null && (
            <span className="ml-2 text-base font-medium text-budget-space-copy">
              {total}件
            </span>
          )}
        </h2>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="検索結果を閉じる"
        title="検索結果を閉じる"
        className="shrink-0 rounded-md border border-budget-space-line text-white hover:bg-budget-space-mid hover:text-white"
      >
        <X aria-hidden="true" className="size-5" />
      </Button>
    </div>
  );
}

function SearchMessage({
  icon: Icon,
  title,
  copy,
  actionLabel,
  onAction,
}: {
  icon: typeof AlertCircle;
  title: string;
  copy: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <Icon aria-hidden="true" className="size-10 text-budget-space-eyebrow" />
      <p className="mt-4 text-lg font-bold text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-budget-space-copy">
        {copy}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onAction}
        className="mt-5 rounded-md border-budget-space-line bg-white text-mirai-text"
      >
        <Search aria-hidden="true" className="size-4" />
        {actionLabel}
      </Button>
    </div>
  );
}
