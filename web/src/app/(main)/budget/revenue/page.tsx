import type { Metadata } from "next";
import { BudgetRevenueDirectoryPage } from "@/features/budget/server/components/budget-revenue-directory-page";
import { loadBudgetRevenueDirectory } from "@/features/budget/server/loaders/load-budget-revenue-directory";
import { BUDGET_PUBLIC_FISCAL_YEAR } from "@/features/budget/shared/constants/budget";
import {
  type BudgetDirectorySearchParams,
  parseBudgetDirectorySearchParams,
} from "@/features/budget/shared/utils/budget-directory";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "歳入を確認する | 触れる予算",
  description:
    "世田谷区の令和8年度当初予算の歳入を、会計・款・項・目、節、細節から確認できます。",
  alternates: { canonical: routes.budgetRevenue() },
};

type BudgetRevenueRouteProps = {
  searchParams: Promise<BudgetDirectorySearchParams>;
};

export default async function BudgetRevenueRoutePage({
  searchParams,
}: BudgetRevenueRouteProps) {
  const filters = parseBudgetDirectorySearchParams(await searchParams);
  const directory = await loadBudgetRevenueDirectory({
    ...filters,
    fiscalYear: BUDGET_PUBLIC_FISCAL_YEAR,
  });
  return <BudgetRevenueDirectoryPage directory={directory} />;
}
