import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LearnLessonPage } from "@/features/learn/server/components/learn-lesson-page";
import {
  findLearnLesson,
  LEARN_LESSONS,
} from "@/features/learn/shared/learn-lessons";
import { routes } from "@/lib/routes";

interface LearnLessonRouteProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEARN_LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: LearnLessonRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = findLearnLesson(slug);

  if (!lesson) {
    return {
      title: "学習ページが見つかりません | みらい議会＠世田谷区",
    };
  }

  return {
    title: `${lesson.title} | 学ぶ | みらい議会＠世田谷区`,
    description: lesson.summary,
    alternates: {
      canonical: routes.learnLesson(lesson.slug),
    },
    openGraph: {
      title: lesson.title,
      description: lesson.summary,
      type: "article",
    },
  };
}

export default async function LearnLessonRoute({
  params,
}: LearnLessonRouteProps) {
  const { slug } = await params;
  const lesson = findLearnLesson(slug);

  if (!lesson) {
    notFound();
  }

  return <LearnLessonPage lesson={lesson} />;
}
