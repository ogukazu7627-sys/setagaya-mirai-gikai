import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BudgetQuestionPage } from "@/features/budget/server/components/budget-question-page";
import { loadBudgetQuestionCategoryPage } from "@/features/budget/server/loaders/load-budget-questions";
import { getBudgetQuestionCategoryBySlug } from "@/features/budget/shared/constants/budget-question-categories";
import { routes } from "@/lib/routes";
import { isUuid } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";

interface BudgetQuestionCategoryRouteProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ focus?: string | string[] }>;
}

function getFocusBillId(focus: string | string[] | undefined): string | null {
  const value = Array.isArray(focus) ? focus[0] : focus;
  return value && isUuid(value) ? value : null;
}

export async function generateMetadata({
  params,
}: BudgetQuestionCategoryRouteProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = getBudgetQuestionCategoryBySlug(categorySlug);
  if (!category) {
    return {
      title: "議員の質問が見つかりません",
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name}に関する議員の発言 | 触れる予算`;
  const description = `世田谷区議会で行われた${category.name}分野の予算質問を、議員ごとに確認できます。`;
  const canonical = routes.budgetQuestionCategory(category.slug);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: ["/ogp.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/ogp.jpg"],
    },
  };
}

export default async function BudgetQuestionCategoryRoutePage({
  params,
  searchParams,
}: BudgetQuestionCategoryRouteProps) {
  const [{ categorySlug }, { focus }, difficultyLevel] = await Promise.all([
    params,
    searchParams,
    getDifficultyLevel(),
  ]);
  const focusBillId = getFocusBillId(focus);
  const pageData = await loadBudgetQuestionCategoryPage({
    categorySlug,
    difficultyLevel,
  });

  if (!pageData) {
    notFound();
  }

  return <BudgetQuestionPage {...pageData} focusBillId={focusBillId} />;
}
