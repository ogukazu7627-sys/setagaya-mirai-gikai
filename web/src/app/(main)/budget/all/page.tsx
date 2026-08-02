import type { Metadata } from "next";
import { BudgetProgramDirectoryPage } from "@/features/budget/server/components/budget-program-directory-page";
import { loadBudgetProgramDirectory } from "@/features/budget/server/loaders/load-budget-program-directory";
import { BUDGET_PUBLIC_FISCAL_YEAR } from "@/features/budget/shared/constants/budget";
import {
  type BudgetDirectorySearchParams,
  parseBudgetDirectorySearchParams,
} from "@/features/budget/shared/utils/budget-directory";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "公式予算分類から歳出を探す | 触れる予算",
  description:
    "世田谷区の令和8年度当初予算を、会計・款・項・目から全予算事業へたどれます。",
  alternates: { canonical: routes.budgetAll() },
};

type BudgetAllRouteProps = {
  searchParams: Promise<BudgetDirectorySearchParams>;
};

export default async function BudgetAllRoutePage({
  searchParams,
}: BudgetAllRouteProps) {
  const filters = parseBudgetDirectorySearchParams(await searchParams);
  const directory = await loadBudgetProgramDirectory({
    ...filters,
    fiscalYear: BUDGET_PUBLIC_FISCAL_YEAR,
  });
  return <BudgetProgramDirectoryPage directory={directory} />;
}
