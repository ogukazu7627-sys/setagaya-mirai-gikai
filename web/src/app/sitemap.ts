import type { MetadataRoute } from "next";
import { getBills } from "@/features/bills/server/loaders/get-bills";
import { BUDGET_QUESTION_CATEGORIES } from "@/features/budget/shared/constants/budget-question-categories";
import { findPublishedGeneralQuestionCategoryReferences } from "@/features/general-questions/server/repositories/general-question-repository";
import { LEARN_LESSONS } from "@/features/learn/shared/learn-lessons";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.webUrl.replace(/\/+$/, "");

  const [bills, generalQuestionCategories] = await Promise.all([
    getBills(),
    findPublishedGeneralQuestionCategoryReferences(),
  ]);

  const billUrls = bills.map((bill) => ({
    url: `${baseUrl}${routes.billDetail(bill.id)}`,
    lastModified: new Date(bill.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const navigationUrls = [
    routes.bills(),
    routes.budget(),
    routes.councilors(),
    routes.committees(),
    routes.learn(),
  ].map((pathname) => ({
    url: `${baseUrl}${pathname}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const learnLessonUrls = LEARN_LESSONS.map((lesson) => ({
    url: `${baseUrl}${routes.learnLesson(lesson.slug)}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const budgetQuestionCategoryUrls = BUDGET_QUESTION_CATEGORIES.map(
    (category) => ({
      url: `${baseUrl}${routes.budgetQuestionCategory(category.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })
  );
  const generalQuestionCategoryUrls = generalQuestionCategories.map(
    (category) => ({
      url: `${baseUrl}${routes.generalQuestionCategory(
        category.year,
        category.categoryId
      )}`,
      lastModified: new Date(category.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    ...navigationUrls,
    ...learnLessonUrls,
    ...budgetQuestionCategoryUrls,
    ...generalQuestionCategoryUrls,
    ...billUrls,
  ];
}
