import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { parseCalendarYear } from "@/features/diet-sessions/shared/utils/calendar-year";
import { resolveLegacyGeneralQuestionCategoryRoute } from "@/features/general-questions/server/loaders/load-general-question-category-page";
import { isRecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { routes } from "@/lib/routes";
import { isUuid } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "一般質問 | 世田谷区議会",
  robots: { index: false, follow: true },
};

type LegacyGeneralQuestionCategoryRouteProps = {
  params: Promise<{ categoryId: string; year: string }>;
  searchParams: Promise<{ focus?: string | string[] }>;
};

function getFocusBillId(focus: string | string[] | undefined): string | null {
  const value = Array.isArray(focus) ? focus[0] : focus;
  return value && isUuid(value) ? value : null;
}

export default async function LegacyGeneralQuestionCategoryRoutePage({
  params,
  searchParams,
}: LegacyGeneralQuestionCategoryRouteProps) {
  const [{ categoryId, year: yearParam }, { focus }] = await Promise.all([
    params,
    searchParams,
  ]);
  const year = parseCalendarYear(yearParam);
  if (!year || !isRecommendationCategoryId(categoryId)) {
    notFound();
  }

  const target = await resolveLegacyGeneralQuestionCategoryRoute({
    categoryId,
    year,
    focusBillId: getFocusBillId(focus),
  });
  if (!target) {
    notFound();
  }

  redirect(
    routes.generalQuestionCategory(
      target.year,
      target.categoryId,
      target.sessionKey,
      target.focusBillId ?? undefined
    ) as Route
  );
}
