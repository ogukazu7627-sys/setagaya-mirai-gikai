import "server-only";

import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  Info,
  ListTree,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { BudgetDirectoryFilters } from "../../client/components/budget-directory-filters";
import type {
  BudgetRevenueDetail,
  BudgetRevenueDirectory,
  BudgetRevenueDirectoryItem,
} from "../../shared/types/budget";
import {
  formatBudgetAmount,
  formatBudgetDifference,
  formatRawThousandYen,
} from "../../shared/utils/budget-page-view";
import { describeBudgetSourceReference } from "../../shared/utils/budget-source-reference";
import {
  BudgetDirectoryHeader,
  BudgetDirectoryPagination,
  BudgetDirectoryUnavailable,
} from "./budget-directory-primitives";

export function BudgetRevenueDirectoryPage({
  directory,
}: {
  directory: BudgetRevenueDirectory;
}) {
  const fiscalYear =
    directory.activeDataset?.fiscalYear ?? directory.selection.fiscalYear;
  return (
    <main className="min-h-dvh bg-mirai-surface">
      <BudgetDirectoryHeader fiscalYear={fiscalYear} kind="revenue" />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {directory.status !== "ready" ? (
          <BudgetDirectoryUnavailable status={directory.status} />
        ) : (
          <>
            <div className="mb-6 flex gap-3 border-y border-budget-overview-border bg-budget-overview px-4 py-4 text-sm leading-6 text-mirai-text-secondary sm:px-5">
              <Info aria-hidden="true" className="mt-1 size-4 shrink-0" />
              <p>
                歳入と歳出は予算の両面です。両者を足して区の予算規模として表示していません。関連事業への配分額も公開資料からは確認できません。
              </p>
            </div>
            <BudgetDirectoryFilters
              key={JSON.stringify(directory.selection)}
              hierarchy={directory.hierarchy}
              kind="revenue"
              selection={directory.selection}
            />
            <section
              aria-labelledby="budget-revenue-directory-title"
              className="mt-8"
            >
              <div className="flex flex-col gap-2 border-b border-mirai-border pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="budget-revenue-directory-title"
                    className="text-2xl font-bold text-mirai-text"
                  >
                    歳入の目
                  </h2>
                  <p className="mt-1 text-sm text-mirai-text-secondary">
                    金額単位は千円です。節・細節と担当部署は各項目を開いて確認できます。
                  </p>
                </div>
                <p className="font-bold tabular-nums text-primary-strong">
                  {directory.total.toLocaleString("ja-JP")}件
                </p>
              </div>

              {directory.items.length === 0 ? (
                <div className="border-b border-mirai-border bg-white px-5 py-10 text-center">
                  <p className="font-bold text-mirai-text">
                    条件に一致する歳入項目はありません
                  </p>
                  <Button
                    asChild
                    variant="link"
                    className="mt-3 text-primary-strong"
                  >
                    <Link href={routes.budgetRevenue()}>絞り込みを解除</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  {directory.items.map((entry) => (
                    <RevenueDirectoryCard
                      key={entry.item.revenueItemKey}
                      entry={entry}
                    />
                  ))}
                </div>
              )}
            </section>
            <BudgetDirectoryPagination
              kind="revenue"
              selection={directory.selection}
              total={directory.total}
            />
          </>
        )}
      </div>
    </main>
  );
}

function RevenueDirectoryCard({
  entry,
}: {
  entry: BudgetRevenueDirectoryItem;
}) {
  const { item } = entry;
  const isGeneralAccount = item.accountCode === "general";
  const fundingCategoryNames = [
    ...new Set(
      entry.details
        .map((detail) => detail.sourceFundingCategoryName)
        .filter(Boolean)
    ),
  ].sort((left, right) => left.localeCompare(right, "ja"));

  return (
    <article
      id={item.revenueItemKey}
      className="border border-mirai-border bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{item.accountName}</Badge>
        {item.isZeroAmount && <Badge variant="secondary">0円項目</Badge>}
      </div>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-7 text-mirai-text">
            {item.moku.code} {item.moku.name}
          </h3>
          <div className="mt-3 flex gap-2 text-sm leading-6 text-mirai-text-secondary">
            <ListTree aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <p>
              {item.kan.code} {item.kan.name} &gt; {item.kou.code}{" "}
              {item.kou.name} &gt; {item.moku.code} {item.moku.name}
            </p>
          </div>
        </div>
        <div className="shrink-0 md:text-right">
          <p className="text-xs font-bold text-mirai-text-secondary">
            当年度額
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary-strong">
            {formatBudgetAmount(item.currentAmountThousandYen)}
          </p>
          <p className="mt-1 text-xs tabular-nums text-mirai-text-muted">
            {formatRawThousandYen(item.currentAmountThousandYen)}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid divide-y divide-mirai-border border-y border-mirai-border text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <AmountDefinition
          label="前年度額"
          value={formatRawThousandYen(item.previousAmountThousandYen)}
        />
        <AmountDefinition
          label="当年度額"
          value={formatRawThousandYen(item.currentAmountThousandYen)}
        />
        <AmountDefinition
          label="増減"
          value={formatBudgetDifference(item.diffAmountThousandYen)}
        />
      </dl>

      <section
        aria-label="歳入構成"
        className="mt-5 border-l-4 border-budget-overview-accent pl-4"
      >
        <div className="flex items-center gap-2 font-bold text-mirai-text">
          <CircleDollarSign aria-hidden="true" className="size-4" />
          {isGeneralAccount ? "一般会計の歳入構成" : "特別会計の歳入源"}
        </div>
        {isGeneralAccount ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-mirai-text-secondary">一般財源</dt>
              <dd className="mt-1 font-bold tabular-nums text-mirai-text">
                {formatRawThousandYen(item.generalRevenueThousandYen)}
              </dd>
            </div>
            <div>
              <dt className="text-mirai-text-secondary">特定財源</dt>
              <dd className="mt-1 font-bold tabular-nums text-mirai-text">
                {formatRawThousandYen(item.specificRevenueThousandYen)}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-3">
            <p className="font-bold tabular-nums text-mirai-text">
              {formatRawThousandYen(item.specialAccountRevenueThousandYen)}
            </p>
            {fundingCategoryNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fundingCategoryNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <details className="mt-6 border-t border-mirai-border pt-4">
        <summary className="cursor-pointer font-bold text-mirai-text">
          節・細節を確認（節 {entry.sections.length}件、細節{" "}
          {entry.details.length}
          件）
        </summary>
        <div className="mt-3 divide-y divide-mirai-border">
          {entry.sections.map((section) => {
            const details = entry.details.filter(
              (detail) => detail.revenueSectionId === section.revenueSectionId
            );
            return (
              <section key={section.revenueSectionId} className="py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <h4 className="font-bold text-mirai-text">
                    節 {section.setsu.code} {section.setsu.name}
                  </h4>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-primary-strong">
                    {formatRawThousandYen(section.currentAmountThousandYen)}
                  </p>
                </div>
                <ul className="mt-3 divide-y divide-mirai-border border-l border-mirai-border pl-4">
                  {details.map((detail) => (
                    <RevenueDetailRow
                      key={detail.revenueDetailId}
                      detail={detail}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </details>

      <section
        aria-labelledby={`related-programs-${item.revenueItemKey}`}
        className="mt-6 border-t border-mirai-border pt-4"
      >
        <h4
          id={`related-programs-${item.revenueItemKey}`}
          className="font-bold text-mirai-text"
        >
          関連する歳出事業 {entry.relatedExpenditurePrograms.length}件
        </h4>
        <p className="mt-1 text-xs leading-5 text-mirai-text-secondary">
          予算書上の関係を示します。歳入額を各事業へ配分した金額ではありません。
        </p>
        {entry.relatedExpenditurePrograms.length > 0 ? (
          <ul className="mt-3 divide-y divide-mirai-border">
            {entry.relatedExpenditurePrograms.map((program) => (
              <li key={program.budgetProgramIdentityId}>
                <Link
                  href={routes.budgetProgramDetail(
                    program.budgetProgramIdentityId
                  )}
                  className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm hover:text-primary-strong"
                >
                  <span>
                    <span className="font-bold">
                      {program.displayProgramName}
                    </span>
                    <span className="mt-0.5 block text-xs text-mirai-text-secondary">
                      {program.departmentDisplayName || "担当部署表示なし"}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mirai-text-muted">
            公開資料上で接続できる歳出事業はありません。
          </p>
        )}
      </section>
    </article>
  );
}

function AmountDefinition({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 sm:px-4">
      <dt className="text-xs text-mirai-text-secondary">{label}</dt>
      <dd className="mt-1 font-bold tabular-nums text-mirai-text">{value}</dd>
    </div>
  );
}

function RevenueDetailRow({ detail }: { detail: BudgetRevenueDetail }) {
  return (
    <li className="py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="font-bold text-mirai-text">
            細節 {detail.saisetsu.code} {detail.saisetsu.name}
          </p>
          <p className="mt-1 text-xs text-mirai-text-secondary">
            {detail.sourceFundingCategoryName}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-mirai-text-secondary">
            <Building2 aria-hidden="true" className="size-3.5" />
            {detail.departmentDisplayName || "担当部署表示なし"}
          </p>
          <p className="mt-1 text-xs text-mirai-text-muted">
            {describeBudgetSourceReference(detail.sourceReference)}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-primary-strong">
          {formatRawThousandYen(detail.currentAmountThousandYen)}
        </p>
      </div>
    </li>
  );
}
