import "server-only";

import { ArrowRight, Building2, ListTree } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { BudgetDirectoryFilters } from "../../client/components/budget-directory-filters";
import { BudgetDirectorySearch } from "../../client/components/budget-directory-search";
import type {
  BudgetProgramDirectory,
  BudgetProgramDirectoryItem,
} from "../../shared/types/budget";
import {
  formatBudgetAmount,
  formatRawThousandYen,
} from "../../shared/utils/budget-page-view";
import {
  BudgetDirectoryHeader,
  BudgetDirectoryPagination,
  BudgetDirectoryUnavailable,
} from "./budget-directory-primitives";

export function BudgetProgramDirectoryPage({
  directory,
}: {
  directory: BudgetProgramDirectory;
}) {
  const fiscalYear =
    directory.activeDataset?.fiscalYear ?? directory.selection.fiscalYear;
  return (
    <main className="min-h-dvh bg-mirai-surface">
      <BudgetDirectoryHeader fiscalYear={fiscalYear} kind="expenditure" />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {directory.status !== "ready" ? (
          <BudgetDirectoryUnavailable status={directory.status} />
        ) : (
          <>
            <BudgetDirectorySearch
              key={`search-${fiscalYear}-${directory.selection.accountCode ?? "all"}-${directory.selection.includeZeroAmount}`}
              accountCode={directory.selection.accountCode}
              fiscalYear={fiscalYear}
              includeZeroAmount={directory.selection.includeZeroAmount}
            />
            <BudgetDirectoryFilters
              key={JSON.stringify(directory.selection)}
              hierarchy={directory.hierarchy}
              kind="expenditure"
              selection={directory.selection}
            />
            <section
              aria-labelledby="budget-program-directory-title"
              className="mt-8"
            >
              <div className="flex flex-col gap-2 border-b border-mirai-border pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="budget-program-directory-title"
                    className="text-2xl font-bold text-mirai-text"
                  >
                    予算事業
                  </h2>
                  <p className="mt-1 text-sm text-mirai-text-secondary">
                    課題に未分類の事業も含む、公式データ由来の予算事業です。
                  </p>
                </div>
                <p className="font-bold tabular-nums text-primary-strong">
                  {directory.total.toLocaleString("ja-JP")}件
                </p>
              </div>

              {directory.items.length === 0 ? (
                <div className="border-b border-mirai-border bg-white px-5 py-10 text-center">
                  <p className="font-bold text-mirai-text">
                    条件に一致する予算事業はありません
                  </p>
                  <Button
                    asChild
                    variant="link"
                    className="mt-3 text-primary-strong"
                  >
                    <Link href={routes.budgetAll()}>絞り込みを解除</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {directory.items.map((item) => (
                    <ProgramDirectoryCard
                      key={item.identity.budgetProgramIdentityId}
                      item={item}
                    />
                  ))}
                </div>
              )}
            </section>
            <BudgetDirectoryPagination
              kind="expenditure"
              selection={directory.selection}
              total={directory.total}
            />
          </>
        )}
      </div>
    </main>
  );
}

function ProgramDirectoryCard({ item }: { item: BudgetProgramDirectoryItem }) {
  const { identity, memberPrograms } = item;
  return (
    <article className="flex flex-col border border-mirai-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{identity.accountName}</Badge>
        {identity.isZeroAmount && <Badge variant="secondary">0円事業</Badge>}
      </div>
      <h3 className="mt-4 text-xl font-bold leading-7 text-mirai-text">
        <Link
          href={routes.budgetProgramDetail(identity.budgetProgramIdentityId)}
          className="hover:text-primary-strong hover:underline hover:underline-offset-4"
        >
          {identity.displayProgramName}
        </Link>
      </h3>
      <p className="mt-2 text-xl font-bold tabular-nums text-primary-strong">
        {formatBudgetAmount(identity.amountThousandYen)}
      </p>
      <p className="mt-1 text-xs tabular-nums text-mirai-text-muted">
        {formatRawThousandYen(identity.amountThousandYen)}
      </p>
      <div className="mt-4 flex gap-2 text-sm leading-6 text-mirai-text-secondary">
        <ListTree aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <p>
          {identity.kan.code} {identity.kan.name} &gt; {identity.kou.code}{" "}
          {identity.kou.name} &gt; {identity.moku.code} {identity.moku.name}
        </p>
      </div>
      <div className="mt-2 flex gap-2 text-sm text-mirai-text-secondary">
        <Building2 aria-hidden="true" className="size-4 shrink-0" />
        <p>{identity.departmentDisplayName || "担当部署表示なし"}</p>
      </div>

      <details className="mt-5 border-t border-mirai-border pt-4">
        <summary className="cursor-pointer text-sm font-bold text-mirai-text">
          内部の事業明細 {memberPrograms.length}件
        </summary>
        <ul className="mt-3 divide-y divide-mirai-border">
          {memberPrograms.map((program) => (
            <li key={program.programId} className="py-3">
              <p className="font-bold text-mirai-text">
                {program.detailProgramName || program.budgetProgramName}
              </p>
              <p className="mt-1 text-xs leading-5 text-mirai-text-secondary">
                大事業：{program.majorProgramName || "名称なし"} / 予算事業：
                {program.budgetProgramName || "名称なし"}
              </p>
              <p className="mt-1 text-sm tabular-nums text-primary-strong">
                {formatBudgetAmount(program.amountThousandYen)}
              </p>
            </li>
          ))}
        </ul>
      </details>

      <Button
        asChild
        variant="link"
        className="mt-auto self-end pt-5 text-primary-strong"
      >
        <Link
          href={routes.budgetProgramDetail(identity.budgetProgramIdentityId)}
        >
          事業の詳細
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    </article>
  );
}
