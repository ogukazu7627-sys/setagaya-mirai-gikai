import type { Metadata } from "next";
import { BudgetOfficialHierarchyPage } from "@/features/budget/server/components/budget-official-hierarchy-page";
import { getBudgetOfficialHierarchy } from "@/features/budget/server/services/budget-query-service";
import {
  BUDGET_ACCOUNT_CODES,
  BUDGET_PUBLIC_FISCAL_YEAR,
} from "@/features/budget/shared/constants/budget";
import type { BudgetAccountCode } from "@/features/budget/shared/types/budget";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "公式予算分類から探す | 触れる予算",
  description:
    "世田谷区の令和8年度当初予算を、会計・款・項・目の公式分類から探せます。",
  alternates: { canonical: "/budget/official" },
};

type BudgetOfficialRouteProps = {
  searchParams: Promise<{ account?: string | string[] }>;
};

export default async function BudgetOfficialRoutePage({
  searchParams,
}: BudgetOfficialRouteProps) {
  const accountParam = (await searchParams).account;
  const selectedAccountCode = isBudgetAccountCode(accountParam)
    ? accountParam
    : "general";
  const hierarchy = await getBudgetOfficialHierarchy({
    fiscalYear: BUDGET_PUBLIC_FISCAL_YEAR,
    accountCode: selectedAccountCode,
  });

  return (
    <BudgetOfficialHierarchyPage
      hierarchy={hierarchy}
      selectedAccountCode={selectedAccountCode}
    />
  );
}

function isBudgetAccountCode(
  value: string | string[] | undefined
): value is BudgetAccountCode {
  return (
    typeof value === "string" &&
    BUDGET_ACCOUNT_CODES.some((accountCode) => accountCode === value)
  );
}
