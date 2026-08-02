import "server-only";

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes, type BudgetDirectoryRouteFilters } from "@/lib/routes";
import type { BudgetDirectorySelection } from "../../shared/types/budget";
import { formatJapaneseFiscalYear } from "../../shared/utils/budget-page-view";

export type BudgetDirectoryKind = "expenditure" | "revenue";

export function BudgetDirectoryHeader({
  fiscalYear,
  kind,
}: {
  fiscalYear: number;
  kind: BudgetDirectoryKind;
}) {
  const isExpenditure = kind === "expenditure";
  return (
    <header className="border-b border-mirai-border bg-white px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 rounded-md text-primary-strong"
        >
          <Link href={routes.budget()}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            触れる予算へ戻る
          </Link>
        </Button>
        <p className="mt-7 text-sm font-bold text-budget-overview-accent">
          世田谷区 {formatJapaneseFiscalYear(fiscalYear)}当初予算
        </p>
        <h1 className="mt-2 text-3xl font-bold text-mirai-text sm:text-4xl">
          {isExpenditure ? "公式予算分類から歳出を探す" : "歳入を確認する"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-mirai-text-secondary">
          {isExpenditure
            ? "公式資料の会計・款・項・目をたどり、課題への分類有無にかかわらず予算事業を確認できます。"
            : "公式資料の会計・款・項・目から、歳入の節・細節、担当部署、関係が記載された歳出事業を確認できます。"}
        </p>
        <nav
          aria-label="予算データの種類"
          className="mt-6 flex flex-wrap gap-2"
        >
          <Button
            asChild
            size="sm"
            variant={isExpenditure ? "default" : "outline"}
            className="rounded-md"
          >
            <Link href={routes.budgetAll()}>歳出の公式分類</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={isExpenditure ? "outline" : "default"}
            className="rounded-md"
          >
            <Link href={routes.budgetRevenue()}>歳入</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function BudgetDirectoryPagination({
  kind,
  selection,
  total,
}: {
  kind: BudgetDirectoryKind;
  selection: BudgetDirectorySelection;
  total: number;
}) {
  const totalPages = Math.ceil(total / selection.pageSize);
  if (totalPages <= 1) {
    return null;
  }
  const currentPage = Math.min(selection.page, totalPages);
  const route =
    kind === "expenditure" ? routes.budgetAll : routes.budgetRevenue;
  const routeFilters = (page: number): BudgetDirectoryRouteFilters => ({
    accountCode: selection.accountCode,
    kanCode: selection.kanCode,
    kouCode: selection.kouCode,
    mokuCode: selection.mokuCode,
    includeZeroAmount: selection.includeZeroAmount,
    sort: selection.sort,
    page,
  });

  return (
    <nav
      aria-label={`${kind === "expenditure" ? "歳出事業" : "歳入項目"}のページ`}
      className="mt-8 flex items-center justify-center gap-3"
    >
      <Button
        asChild={currentPage > 1}
        disabled={currentPage <= 1}
        variant="outline"
        size="sm"
        className="rounded-md"
      >
        {currentPage > 1 ? (
          <Link href={route(routeFilters(currentPage - 1))}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            前へ
          </Link>
        ) : (
          <span>
            <ChevronLeft aria-hidden="true" className="size-4" />
            前へ
          </span>
        )}
      </Button>
      <span className="min-w-20 text-center text-sm tabular-nums text-mirai-text-secondary">
        {currentPage} / {totalPages}
      </span>
      <Button
        asChild={currentPage < totalPages}
        disabled={currentPage >= totalPages}
        variant="outline"
        size="sm"
        className="rounded-md"
      >
        {currentPage < totalPages ? (
          <Link href={route(routeFilters(currentPage + 1))}>
            次へ
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <span>
            次へ
            <ChevronRight aria-hidden="true" className="size-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}

export function BudgetDirectoryUnavailable({
  status,
}: {
  status: "empty" | "error";
}) {
  return (
    <div className="border-y border-mirai-border bg-white px-5 py-10 text-center">
      <p className="font-bold text-mirai-text">
        {status === "empty"
          ? "公開中の当初予算データはまだありません"
          : "予算データを現在取得できません"}
      </p>
      <p className="mt-2 text-sm leading-6 text-mirai-text-secondary">
        {status === "empty"
          ? "公開準備が整い次第、このページに公式データを表示します。"
          : "時間をおいて、もう一度お試しください。"}
      </p>
    </div>
  );
}
