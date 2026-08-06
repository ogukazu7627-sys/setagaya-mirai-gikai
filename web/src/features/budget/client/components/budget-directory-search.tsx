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
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";
import type {
  BudgetAccountCode,
  BudgetProgramSearchResult,
} from "../../shared/types/budget";
import { formatBudgetAmount } from "../../shared/utils/budget-page-view";
import { requestBudgetProgramSearch } from "../utils/budget-search-api";
import { getBrowserBudgetSearchInstallationId } from "../utils/budget-search-storage";

type DirectorySearchStatus =
  | "idle"
  | "searching"
  | "results"
  | "empty"
  | "error";

export function BudgetDirectorySearch({
  accountCode,
  fiscalYear,
  includeZeroAmount,
}: {
  accountCode: BudgetAccountCode | null;
  fiscalYear: number;
  includeZeroAmount: boolean;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [status, setStatus] = useState<DirectorySearchStatus>("idle");
  const [result, setResult] = useState<BudgetProgramSearchResult | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    []
  );

  const executeSearch = async (normalizedQuery: string, page = 1) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setSubmittedQuery(normalizedQuery);
    setStatus("searching");

    try {
      const nextResult = await requestBudgetProgramSearch(
        {
          installationId: getBrowserBudgetSearchInstallationId(),
          query: normalizedQuery,
          fiscalYear,
          accountCode,
          includeZeroAmount,
          page,
        },
        controller.signal
      );
      if (controller.signal.aborted) {
        return;
      }
      setResult(nextResult);
      setStatus(nextResult.items.length > 0 ? "results" : "empty");
    } catch (error) {
      if (
        !controller.signal.aborted &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setResult(null);
        setStatus("error");
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) {
      return;
    }
    void executeSearch(normalizedQuery);
  };

  const clearSearch = () => {
    requestControllerRef.current?.abort();
    setQuery("");
    setSubmittedQuery("");
    setResult(null);
    setStatus("idle");
  };

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;
  const announcement =
    status === "searching"
      ? "予算事業を検索中です"
      : status === "results"
        ? `${result?.total ?? 0}件の予算事業が見つかりました`
        : status === "empty"
          ? "一致する予算事業は見つかりませんでした"
          : status === "error"
            ? "予算事業を検索できませんでした"
            : "";

  return (
    <section
      aria-labelledby="budget-directory-search-title"
      className="mb-5 border-y border-mirai-border bg-white px-4 py-5 sm:px-6"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-mirai-text">
        <Search aria-hidden="true" className="size-4" />
        <h2 id="budget-directory-search-title">予算事業を検索</h2>
      </div>
      <p className="mt-2 text-xs leading-5 text-mirai-text-secondary">
        事業名、事業明細、担当部署、款・項・目、公開テーマから検索できます。
        {accountCode
          ? "現在選択中の会計が検索対象です。"
          : "すべての会計が検索対象です。"}
      </p>
      <form
        role="search"
        aria-busy={status === "searching"}
        className="mt-4 flex max-w-3xl items-center gap-2"
        onSubmit={handleSubmit}
      >
        <label htmlFor="budget-directory-search" className="sr-only">
          予算事業を検索
        </label>
        <Input
          id="budget-directory-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="例：学校の改築、子育て支援"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={100}
          aria-controls="budget-directory-search-results"
          className="h-11 rounded-md border-mirai-border bg-white text-base shadow-none"
        />
        <Button
          type="submit"
          size="sm"
          disabled={status === "searching" || query.trim() === ""}
          className="h-11 shrink-0 rounded-md"
        >
          {status === "searching" ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Search aria-hidden="true" className="size-4" />
          )}
          検索
        </Button>
      </form>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {status !== "idle" && status !== "searching" && (
        <div id="budget-directory-search-results" className="mt-5">
          <div className="flex items-center justify-between gap-3 border-b border-mirai-border pb-3">
            <p className="min-w-0 text-sm font-bold text-mirai-text">
              <span className="break-words">「{submittedQuery}」</span>
              {status === "results" && (
                <span className="ml-2 tabular-nums text-primary-strong">
                  {result?.total.toLocaleString("ja-JP")}件
                </span>
              )}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="shrink-0 rounded-md"
            >
              <X aria-hidden="true" className="size-4" />
              閉じる
            </Button>
          </div>

          {status === "empty" && (
            <DirectorySearchMessage
              icon={SearchX}
              title="一致する予算事業はありません"
              description="言葉を短くするか、別の表現で検索してみてください。"
            />
          )}
          {status === "error" && (
            <DirectorySearchMessage
              icon={AlertCircle}
              title="検索できませんでした"
              description="少し待ってから、もう一度お試しください。"
            />
          )}
          {status === "results" && result && (
            <>
              <ul className="grid gap-3 pt-4 lg:grid-cols-2">
                {result.items.map((item) => (
                  <li key={item.budgetProgramIdentityId}>
                    <Link
                      href={routes.budgetProgramDetail(
                        item.budgetProgramIdentityId
                      )}
                      className="group flex h-full min-h-36 flex-col border border-mirai-border bg-mirai-surface px-4 py-4 outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-bold leading-6 text-mirai-text group-hover:text-primary-strong">
                          {item.displayProgramName}
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="mt-1 size-4 shrink-0 text-primary-strong"
                        />
                      </span>
                      <span className="mt-1 font-bold tabular-nums text-primary-strong">
                        {formatBudgetAmount(item.amountThousandYen)}
                      </span>
                      <span className="mt-2 text-xs leading-5 text-mirai-text-secondary">
                        {item.kan.name} &gt; {item.kou.name} &gt;{" "}
                        {item.moku.name}
                      </span>
                      <span className="mt-1 text-xs leading-5 text-mirai-text-secondary">
                        {item.departmentDisplayName || "担当部署表示なし"}
                      </span>
                      <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
                        <Badge variant="outline">{item.accountName}</Badge>
                        {item.publishedTopics.slice(0, 2).map((topic) => (
                          <Badge key={topic.slug} variant="secondary">
                            {topic.name}
                          </Badge>
                        ))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <nav
                  aria-label="予算事業の検索結果ページ"
                  className="mt-4 flex items-center justify-center gap-3"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={result.page <= 1}
                    onClick={() =>
                      void executeSearch(submittedQuery, result.page - 1)
                    }
                    className="rounded-md"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                    前へ
                  </Button>
                  <span className="min-w-20 text-center text-sm tabular-nums text-mirai-text-secondary">
                    {result.page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={result.page >= totalPages}
                    onClick={() =>
                      void executeSearch(submittedQuery, result.page + 1)
                    }
                    className="rounded-md"
                  >
                    次へ
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function DirectorySearchMessage({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof AlertCircle;
  title: string;
}) {
  return (
    <div className="py-8 text-center text-mirai-text-secondary">
      <Icon aria-hidden="true" className="mx-auto size-6" />
      <p className="mt-2 font-bold text-mirai-text">{title}</p>
      <p className="mt-1 text-sm">{description}</p>
    </div>
  );
}
