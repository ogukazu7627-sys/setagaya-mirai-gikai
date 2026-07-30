import "server-only";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import type {
  BudgetAccountCode,
  BudgetOfficialHierarchy,
} from "../../shared/types/budget";
import {
  formatBudgetAmount,
  formatRawThousandYen,
} from "../../shared/utils/budget-page-view";

const accountOptions: Array<{
  accountCode: BudgetAccountCode;
  accountName: string;
}> = [
  { accountCode: "general", accountName: "一般会計" },
  {
    accountCode: "national_health_insurance",
    accountName: "国民健康保険事業会計",
  },
  {
    accountCode: "latter_stage_elderly_healthcare",
    accountName: "後期高齢者医療会計",
  },
  {
    accountCode: "long_term_care_insurance",
    accountName: "介護保険事業会計",
  },
  { accountCode: "school_lunch_fee", accountName: "学校給食費会計" },
];

export function BudgetOfficialHierarchyPage({
  hierarchy,
  selectedAccountCode,
}: {
  hierarchy: BudgetOfficialHierarchy;
  selectedAccountCode: BudgetAccountCode;
}) {
  const account = hierarchy.accounts.find(
    (candidate) => candidate.accountCode === selectedAccountCode
  );

  return (
    <main className="min-h-dvh bg-mirai-surface">
      <header className="border-b border-mirai-border bg-white px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl">
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
            世田谷区 令和8年度当初予算
          </p>
          <h1 className="mt-2 text-3xl font-bold text-mirai-text sm:text-4xl">
            公式予算分類から探す
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mirai-text-secondary">
            行政の正式な「会計・款・項・目」の順にたどります。市民目線の大分類とは別の、公式資料に基づく分類です。
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <nav aria-label="会計を選ぶ" className="flex flex-wrap gap-2">
          {accountOptions.map((option) => (
            <Button
              key={option.accountCode}
              asChild
              size="sm"
              variant={
                option.accountCode === selectedAccountCode
                  ? "default"
                  : "outline"
              }
              className="rounded-md"
            >
              <Link href={routes.budgetOfficialHierarchy(option.accountCode)}>
                {option.accountName}
              </Link>
            </Button>
          ))}
        </nav>

        {!account ? (
          <div className="mt-8 border-y border-mirai-border bg-white px-5 py-8">
            <p className="font-bold text-mirai-text">
              この会計の公開データは準備中です
            </p>
            <p className="mt-2 text-sm text-mirai-text-secondary">
              0円会計を含め、確認できた公式データだけを表示します。
            </p>
          </div>
        ) : (
          <section aria-labelledby="official-account-title" className="mt-8">
            <div className="flex flex-col gap-2 border-b border-mirai-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <h2
                id="official-account-title"
                className="text-2xl font-bold text-mirai-text"
              >
                {account.accountName}
              </h2>
              <p className="tabular-nums font-bold text-primary-strong">
                {formatBudgetAmount(account.amountThousandYen)}
              </p>
            </div>
            <div className="divide-y divide-mirai-border border-b border-mirai-border bg-white">
              {account.kans.map((kan) => (
                <details key={kan.code} className="group px-4 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4">
                    <span className="flex min-w-0 items-center gap-2 font-bold text-mirai-text">
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform group-open:rotate-90"
                      />
                      {kan.code} {kan.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-sm text-mirai-text-secondary">
                      {formatRawThousandYen(kan.amountThousandYen)}
                    </span>
                  </summary>
                  <div className="ml-6 border-l border-budget-overview-border pb-3 pl-4">
                    {kan.kous.map((kou) => (
                      <details key={kou.code} className="group/kou">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3">
                          <span className="font-bold text-mirai-text-secondary">
                            {kou.code} {kou.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-xs text-mirai-text-muted">
                            {formatRawThousandYen(kou.amountThousandYen)}
                          </span>
                        </summary>
                        <div className="divide-y divide-mirai-border">
                          {kou.mokus.map((moku) => (
                            <details key={moku.budgetItemKey} className="py-1">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm">
                                <span className="font-bold text-mirai-text">
                                  {moku.code} {moku.name}
                                </span>
                                <span className="shrink-0 tabular-nums text-xs text-mirai-text-muted">
                                  {formatRawThousandYen(moku.amountThousandYen)}
                                </span>
                              </summary>
                              <ul className="mb-3 ml-3 border-l border-mirai-border pl-3">
                                {moku.programs.map((program) => (
                                  <li key={program.budgetProgramIdentityId}>
                                    <Link
                                      href={routes.budgetProgramDetail(
                                        program.budgetProgramIdentityId
                                      )}
                                      className="flex items-start justify-between gap-4 py-2 text-sm hover:text-primary-strong"
                                    >
                                      <span>{program.displayProgramName}</span>
                                      <span className="shrink-0 tabular-nums text-xs">
                                        {formatBudgetAmount(
                                          program.amountThousandYen
                                        )}
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
