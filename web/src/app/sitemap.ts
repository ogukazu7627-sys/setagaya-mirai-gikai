import type { MetadataRoute } from "next";
import { getBills } from "@/features/bills/server/loaders/get-bills";
import { LEARN_LESSONS } from "@/features/learn/shared/learn-lessons";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.webUrl.replace(/\/+$/, "");

  const bills = await getBills();

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

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    ...navigationUrls,
    ...learnLessonUrls,
    ...billUrls,
  ];
}
