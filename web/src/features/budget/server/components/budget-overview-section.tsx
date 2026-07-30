import "server-only";

import {
  BadgeCheck,
  Database,
  Landmark,
  LogIn,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { BudgetPageOverview } from "../../shared/types/budget-page";
import {
  formatBudgetAmount,
  formatRawThousandYen,
} from "../../shared/utils/budget-page-view";

type BudgetOverviewSectionProps = {
  overview: BudgetPageOverview;
};

export function BudgetOverviewSection({
  overview,
}: BudgetOverviewSectionProps) {
  const generalAccount = overview.generalAccount;

  return (
    <section
      aria-labelledby="budget-overview-title"
      className="bg-budget-overview px-4 py-9 sm:px-8 sm:py-12"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-budget-overview-accent">
              公式データから見る
            </p>
            <h2
              id="budget-overview-title"
              className="mt-1 text-2xl font-bold text-mirai-text"
            >
              {overview.title}
            </h2>
          </div>
          {overview.accountCount > 0 && (
            <p className="text-sm font-medium text-mirai-text-secondary">
              {overview.accountCount}会計・{overview.identityCount ?? 0}事業
            </p>
          )}
        </div>

        <div className="mt-7 border-y border-budget-overview-border py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Landmark
                aria-hidden="true"
                className="size-6 shrink-0 text-budget-overview-accent"
              />
              <div>
                <p className="text-sm font-bold text-mirai-text-secondary">
                  一般会計
                </p>
                <p className="mt-1 text-lg font-bold text-mirai-text">
                  {generalAccount
                    ? formatBudgetAmount(
                        generalAccount.expenditureAmountThousandYen
                      )
                    : "公開データ準備中"}
                </p>
              </div>
            </div>
            {generalAccount && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <AmountLabel
                  label="歳入"
                  amount={generalAccount.revenueAmountThousandYen}
                />
                <AmountLabel
                  label="歳出"
                  amount={generalAccount.expenditureAmountThousandYen}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid divide-y divide-budget-overview-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <OverviewMetric
            icon={LogIn}
            label="歳入総額"
            amount={overview.revenueTotalAmountThousandYen}
          />
          <OverviewMetric
            icon={LogOut}
            label="歳出総額"
            amount={overview.expenditureTotalAmountThousandYen}
          />
          <div className="flex min-h-32 items-center gap-4 py-6 sm:px-6">
            {overview.isValidated ? (
              <BadgeCheck
                aria-hidden="true"
                className="size-7 shrink-0 text-budget-validation"
              />
            ) : (
              <Database
                aria-hidden="true"
                className="size-7 shrink-0 text-mirai-text-muted"
              />
            )}
            <div>
              <p className="text-sm font-bold text-mirai-text-secondary">
                データ検証
              </p>
              <p className="mt-1 text-lg font-bold text-mirai-text">
                {overview.isValidated
                  ? "検証済み（PASS）"
                  : overview.validationStatus}
              </p>
              <p className="mt-1 text-xs text-mirai-text-muted">
                公開データの整合性
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AmountLabel({ label, amount }: { label: string; amount: number }) {
  return (
    <div>
      <span className="font-bold text-mirai-text-secondary">{label}</span>
      <span className="ml-2 tabular-nums text-mirai-text">
        {formatRawThousandYen(amount)}
      </span>
    </div>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  amount,
}: {
  icon: LucideIcon;
  label: string;
  amount: number | null;
}) {
  return (
    <div className="flex min-h-32 items-center gap-4 py-6 sm:pr-6">
      <Icon
        aria-hidden="true"
        className="size-7 shrink-0 text-budget-overview-accent"
      />
      <div>
        <p className="text-sm font-bold text-mirai-text-secondary">{label}</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-mirai-text">
          {amount === null ? "—" : formatBudgetAmount(amount)}
        </p>
        {amount !== null && (
          <p className="mt-1 text-xs tabular-nums text-mirai-text-muted">
            {formatRawThousandYen(amount)}
          </p>
        )}
      </div>
    </div>
  );
}
