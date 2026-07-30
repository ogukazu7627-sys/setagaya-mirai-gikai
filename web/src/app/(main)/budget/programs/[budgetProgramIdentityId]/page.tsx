import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BudgetProgramDetailPage } from "@/features/budget/server/components/budget-program-detail-page";
import { loadBudgetProgramDetail } from "@/features/budget/server/loaders/load-budget-program-detail";
import { BudgetDataNotFoundError } from "@/features/budget/server/services/budget-query-service";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

type BudgetProgramRouteProps = {
  params: Promise<{ budgetProgramIdentityId: string }>;
};

export async function generateMetadata({
  params,
}: BudgetProgramRouteProps): Promise<Metadata> {
  const { budgetProgramIdentityId } = await params;
  try {
    const detail = await loadBudgetProgramDetail(budgetProgramIdentityId);
    return {
      title: `${detail.identity.displayProgramName} | 触れる予算`,
      description: `${detail.identity.displayProgramName}の令和8年度当初予算額、公式予算分類、目全体の費目内訳を確認できます。`,
      alternates: {
        canonical: routes.budgetProgramDetail(budgetProgramIdentityId),
      },
    };
  } catch (error) {
    if (error instanceof BudgetDataNotFoundError) {
      return { title: "予算事業が見つかりません" };
    }
    throw error;
  }
}

export default async function BudgetProgramRoutePage({
  params,
}: BudgetProgramRouteProps) {
  const { budgetProgramIdentityId } = await params;
  try {
    const detail = await loadBudgetProgramDetail(budgetProgramIdentityId);
    return <BudgetProgramDetailPage detail={detail} />;
  } catch (error) {
    if (error instanceof BudgetDataNotFoundError) {
      notFound();
    }
    throw error;
  }
}
