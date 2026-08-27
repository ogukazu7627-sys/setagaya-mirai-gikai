import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { parseCalendarYear } from "@/features/diet-sessions/shared/utils/calendar-year";
import { GeneralQuestionPage } from "@/features/general-questions/server/components/general-question-page";
import { loadGeneralQuestionCategoryPage } from "@/features/general-questions/server/loaders/load-general-question-category-page";
import { getGeneralQuestionCategoryById } from "@/features/general-questions/shared/utils/general-question-categories";
import { isRecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { routes } from "@/lib/routes";
import { isUuid } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";

type GeneralQuestionCategoryRouteProps = {
  params: Promise<{ categoryId: string; year: string }>;
  searchParams: Promise<{ focus?: string | string[] }>;
};

function getFocusBillId(focus: string | string[] | undefined): string | null {
  const value = Array.isArray(focus) ? focus[0] : focus;
  return value && isUuid(value) ? value : null;
}

export async function generateMetadata({
  params,
}: GeneralQuestionCategoryRouteProps): Promise<Metadata> {
  const { categoryId, year: yearParam } = await params;
  const year = parseCalendarYear(yearParam);
  const category = getGeneralQuestionCategoryById(categoryId);
  if (!year || !category) {
    return {
      title: "一般質問が見つかりません",
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name}に関する議員の質問 | 世田谷区議会`;
  const description = `${year}年の世田谷区議会で行われた${category.name}分野の一般質問を、議員ごとに確認できます。`;
  const canonical = routes.generalQuestionCategory(year, category.id);
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

export default async function GeneralQuestionCategoryRoutePage({
  params,
  searchParams,
}: GeneralQuestionCategoryRouteProps) {
  const [{ categoryId, year: yearParam }, { focus }, difficultyLevel] =
    await Promise.all([params, searchParams, getDifficultyLevel()]);
  const year = parseCalendarYear(yearParam);
  if (!year || !isRecommendationCategoryId(categoryId)) {
    notFound();
  }

  const pageData = await loadGeneralQuestionCategoryPage({
    categoryId,
    year,
    difficultyLevel,
  });
  if (!pageData) {
    notFound();
  }

  return (
    <GeneralQuestionPage {...pageData} focusBillId={getFocusBillId(focus)} />
  );
}
