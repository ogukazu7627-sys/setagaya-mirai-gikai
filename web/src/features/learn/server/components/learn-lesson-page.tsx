import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import {
  findLearnLesson,
  LEARN_CATEGORY_LABELS,
  type LearnLesson,
} from "../../shared/learn-lessons";
import { LessonVisual } from "./lesson-visual";

interface LearnLessonPageProps {
  lesson: LearnLesson;
}

export function LearnLessonPage({ lesson }: LearnLessonPageProps) {
  const relatedLessons = lesson.relatedSlugs
    .map(findLearnLesson)
    .filter((relatedLesson) => relatedLesson !== undefined);

  return (
    <main className="min-h-dvh bg-white">
      <div className="border-b border-mirai-border bg-[#f6f9f8]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Link
            href={routes.learn() as Route}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-mirai-text transition-colors hover:text-primary-accent"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            学ぶへ戻る
          </Link>

          <div className="mt-4">
            <p className="text-sm font-bold text-primary-accent">
              {LEARN_CATEGORY_LABELS[lesson.category]}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-mirai-text sm:text-4xl">
              {lesson.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-mirai-text-secondary">
              {lesson.summary}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary-accent">
              <Clock3 aria-hidden="true" className="size-4" />約
              {lesson.duration}分
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg">
            <LessonVisual
              title={lesson.title}
              steps={lesson.visualSteps}
              tone={lesson.tone}
              size="hero"
            />
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section aria-labelledby="lesson-key-points-title">
          <p className="text-sm font-bold text-primary-accent">
            ここだけ覚える
          </p>
          <h2
            id="lesson-key-points-title"
            className="mt-2 text-2xl font-bold text-mirai-text"
          >
            3つのポイント
          </h2>
          <ul className="mt-5 divide-y divide-mirai-border border-y border-mirai-border">
            {lesson.keyPoints.map((point) => (
              <li key={point} className="flex gap-3 py-4">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary-accent"
                />
                <span className="text-[15px] font-bold leading-7 text-mirai-text">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 divide-y divide-mirai-border sm:mt-16">
          {lesson.sections.map((section, sectionIndex) => (
            <section
              key={section.title}
              aria-labelledby={`lesson-section-${sectionIndex}`}
              className="py-10 first:pt-0 sm:py-12"
            >
              <h2
                id={`lesson-section-${sectionIndex}`}
                className="text-2xl font-bold leading-relaxed text-mirai-text"
              >
                {section.title}
              </h2>

              {section.paragraphs ? (
                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-[15px] leading-8 text-mirai-text-secondary sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}

              {section.items ? (
                <dl className="mt-6 divide-y divide-mirai-border border-y border-mirai-border">
                  {section.items.map((item) => (
                    <div
                      key={item.title}
                      className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
                    >
                      <dt className="font-bold leading-7 text-mirai-text">
                        {item.title}
                      </dt>
                      <dd className="text-[15px] leading-7 text-mirai-text-secondary">
                        {item.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {section.note ? (
                <aside className="mt-6 rounded-lg border border-[#b9dced] bg-[#eef8fd] p-5">
                  <h3 className="font-bold text-mirai-text">
                    {section.note.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-mirai-text-secondary">
                    {section.note.body}
                  </p>
                </aside>
              ) : null}
            </section>
          ))}
        </div>

        <section
          aria-labelledby="lesson-explore-title"
          className="border-y border-mirai-border py-10"
        >
          <p className="text-sm font-bold text-primary-accent">
            知ったことを使ってみる
          </p>
          <h2
            id="lesson-explore-title"
            className="mt-2 text-2xl font-bold text-mirai-text"
          >
            {lesson.explore.title}
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-mirai-text-secondary">
            {lesson.explore.description}
          </p>
          <Link
            href={lesson.explore.href as Route}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2"
          >
            このサイトで見る
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section
          aria-labelledby="lesson-sources-title"
          className="pt-10 sm:pt-12"
        >
          <p className="text-sm font-bold text-primary-accent">
            一次情報へ戻る
          </p>
          <h2
            id="lesson-sources-title"
            className="mt-2 text-2xl font-bold text-mirai-text"
          >
            参考にした公式情報
          </h2>
          <p className="mt-3 text-sm leading-7 text-mirai-text-secondary">
            このページは、世田谷区議会の公式情報をもとに独自に整理した非公式の解説です。制度や日程の最新情報は、必ず公式ページで確認してください。
          </p>
          <ul className="mt-5 divide-y divide-mirai-border border-y border-mirai-border">
            {lesson.officialSources.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-24 items-center gap-4 py-4 transition-colors hover:bg-mirai-surface-gray"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-7 text-mirai-text">
                      {source.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-mirai-text-secondary">
                      {source.description}
                    </span>
                  </span>
                  <ExternalLink
                    aria-hidden="true"
                    className="size-5 shrink-0 text-primary-accent"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {relatedLessons.length > 0 ? (
          <section
            aria-labelledby="related-lessons-title"
            className="pt-12 sm:pt-16"
          >
            <h2
              id="related-lessons-title"
              className="text-2xl font-bold text-mirai-text"
            >
              次に読む
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {relatedLessons.map((relatedLesson) => (
                <li key={relatedLesson.slug}>
                  <Link
                    href={routes.learnLesson(relatedLesson.slug) as Route}
                    className="group flex h-full min-h-28 items-center gap-4 rounded-lg border border-mirai-border p-4 transition-colors hover:border-primary-accent hover:bg-mirai-surface-gray"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-primary-accent">
                        {LEARN_CATEGORY_LABELS[relatedLesson.category]}
                      </span>
                      <span className="mt-1 block font-bold leading-7 text-mirai-text">
                        {relatedLesson.title}
                      </span>
                      <span className="mt-1 block text-xs text-mirai-text-secondary">
                        約{relatedLesson.duration}分
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-primary-accent transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
