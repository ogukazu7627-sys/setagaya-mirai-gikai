import { ArrowRight, Clock3 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import type { LearnLesson } from "../../shared/learn-lessons";
import { LessonVisual } from "./lesson-visual";

interface LearnLessonCardProps {
  lesson: LearnLesson;
  number?: number;
}

export function LearnLessonCard({ lesson, number }: LearnLessonCardProps) {
  return (
    <Link
      href={routes.learnLesson(lesson.slug) as Route}
      className="group grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-mirai-border bg-white transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2"
    >
      <LessonVisual
        title={lesson.title}
        steps={lesson.visualSteps}
        tone={lesson.tone}
      />
      <span className="flex min-w-0 flex-col p-4 sm:p-5">
        {number ? (
          <span className="mb-3 flex size-7 items-center justify-center rounded-full bg-primary-accent text-sm font-bold text-white">
            {number}
          </span>
        ) : null}
        <span className="block text-lg font-bold leading-relaxed text-mirai-text">
          {lesson.title}
        </span>
        <span className="mt-2 block flex-1 text-sm leading-6 text-mirai-text-secondary">
          {lesson.summary}
        </span>
        <span className="mt-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-accent">
            <Clock3 aria-hidden="true" className="size-4" />約{lesson.duration}
            分
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-5 text-primary-accent transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </Link>
  );
}
