"use client";

import { AlertCircle, ArrowRight, LoaderCircle, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BudgetProgramSearchItem,
  BudgetProgramSearchResult,
} from "../../shared/types/budget";
import { formatBudgetAmount } from "../../shared/utils/budget-page-view";

type BudgetSearchResultsProps = {
  query: string;
  result: BudgetProgramSearchResult | null;
  status: "idle" | "loading" | "success" | "error";
  onSelectResult: (item: BudgetProgramSearchItem) => void;
};

export function BudgetSearchResults({
  query,
  result,
  status,
  onSelectResult,
}: BudgetSearchResultsProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "loading") {
    return (
      <div
        className="mx-auto mt-5 flex max-w-3xl items-center gap-2 text-sm text-mirai-text-secondary"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        予算事業を探しています
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="mx-auto mt-5 flex max-w-3xl items-center gap-2 text-sm text-destructive"
        role="alert"
      >
        <AlertCircle aria-hidden="true" className="size-4" />
        検索できませんでした。少し待ってから、もう一度お試しください。
      </div>
    );
  }

  if (!result || result.items.length === 0) {
    return (
      <div
        className="mx-auto mt-5 flex max-w-3xl items-center gap-2 border-t border-mirai-border pt-5 text-sm text-mirai-text-secondary"
        role="status"
      >
        <SearchX aria-hidden="true" className="size-4" />「{query}
        」に一致する予算事業は見つかりませんでした。
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-3xl border-t border-mirai-border pt-5">
      <p className="text-sm font-bold text-mirai-text">
        「{query}」の検索結果
        <span className="ml-2 font-medium text-mirai-text-muted">
          {result.total}件
        </span>
      </p>
      <ul className="mt-3 divide-y divide-mirai-border">
        {result.items.map((item) => (
          <li key={item.budgetProgramIdentityId}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelectResult(item)}
              className="h-auto w-full justify-between whitespace-normal rounded-md px-2 py-4 text-left hover:bg-mirai-surface-gray"
            >
              <span className="min-w-0">
                <span className="block font-bold text-mirai-text">
                  {item.displayProgramName}
                </span>
                <span className="mt-1 block text-xs font-medium text-mirai-text-muted">
                  {item.departmentDisplayName || "担当部署表示なし"}・
                  {item.moku.name}
                </span>
              </span>
              <span className="ml-4 flex shrink-0 items-center gap-2">
                <span className="tabular-nums text-sm text-mirai-text">
                  {formatBudgetAmount(item.amountThousandYen)}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-primary-strong"
                />
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
