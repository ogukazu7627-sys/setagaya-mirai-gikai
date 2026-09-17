"use client";

import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type LearningSource = {
  id: string;
  title: string;
  url: string;
};

export type LearningLesson = {
  id: string;
  title: string;
  sections: readonly {
    label: string;
    body: string;
    sourceRefs: readonly string[];
  }[];
  quiz: {
    question: string;
    options: readonly string[];
    correctIndex: number;
    explanation: string;
    sourceRefs: readonly string[];
  };
};

function LearningSources({
  sourceRefs,
  sources,
}: {
  sourceRefs: readonly string[];
  sources: readonly LearningSource[];
}) {
  return (
    <ul
      className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs leading-5 text-primary-strong"
      aria-label="出典"
    >
      {sources
        .filter((source) => sourceRefs.includes(source.id))
        .map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 underline underline-offset-4"
            >
              <ExternalLink className="mt-0.5 size-3 shrink-0" />
              {source.title}
            </a>
          </li>
        ))}
    </ul>
  );
}

export function PublicCommentLearning({
  onStartInterview,
  onBack,
  sources,
  lessons,
  reviewedAt,
  courseTitle,
  courseSubtitle,
  courseNote,
}: {
  onStartInterview: () => void;
  onBack: () => void;
  sources: readonly LearningSource[];
  lessons: readonly LearningLesson[];
  reviewedAt: string;
  courseTitle?: string;
  courseSubtitle?: string;
  courseNote?: string;
}) {
  const [chapter, setChapter] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const explanationRef = useRef<HTMLHeadingElement>(null);
  const lesson = lessons[chapter];
  const selected = answers[lesson.id];
  const isRevealed = revealed[lesson.id] === true;
  const isLast = chapter === lessons.length - 1;

  useEffect(() => {
    if (isRevealed) explanationRef.current?.focus();
  }, [isRevealed]);

  useEffect(() => {
    if (lesson.id) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [lesson.id]);

  return (
    <div className="min-h-dvh bg-mirai-light-gradient px-4 py-8 pb-[calc(var(--mobile-primary-navigation-height,0px)+env(safe-area-inset-bottom,0px)+2rem)]">
      <div className="mx-auto max-w-[560px]">
        <Button
          type="button"
          variant="link"
          className="mb-6 text-primary-strong"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          案内画面に戻る
        </Button>
        <div className="mb-6 flex items-center justify-between gap-4 text-sm font-bold text-primary-strong">
          <span className="inline-flex items-center gap-2">
            <BookOpen className="size-5" />
            条例素案について学ぶ
          </span>
          <span>
            <span className="sr-only">章：</span>
            {chapter + 1} / {lessons.length}
          </span>
        </div>
        <Progress
          value={((chapter + 1) / lessons.length) * 100}
          aria-label="学習の進捗"
          className="mb-6 h-[7px] bg-mirai-progress-track"
        />
        {chapter === 0 && courseTitle && (
          <section className="mb-6 rounded-2xl border border-primary/20 bg-white p-6">
            {courseSubtitle && (
              <p className="text-sm font-bold text-primary-strong">
                {courseSubtitle}
              </p>
            )}
            <p className="mt-2 text-xl font-bold leading-8 text-mirai-text">
              {courseTitle}
            </p>
            {courseNote && (
              <p className="mt-3 text-xs leading-6 text-mirai-text-secondary">
                {courseNote}
              </p>
            )}
          </section>
        )}
        <article className="rounded-2xl bg-white p-6">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="scroll-mt-24 text-[22px] font-bold leading-relaxed text-mirai-text outline-none"
          >
            {lesson.title}
          </h1>
          <p className="mt-2 text-xs text-mirai-text-secondary">
            資料確認日：{reviewedAt}
          </p>
          {lesson.sections.map((section, index) => (
            <section key={`${lesson.id}-${index}`} className="mt-6">
              {section.label && (
                <h2 className="text-sm font-bold leading-6 text-primary-strong">
                  {section.label}
                </h2>
              )}
              <p
                className={`${section.label ? "mt-2" : ""} text-[15px] leading-8 text-mirai-text`}
              >
                {section.body}
              </p>
              <LearningSources
                sourceRefs={section.sourceRefs}
                sources={sources}
              />
            </section>
          ))}

          <form
            className="mt-8 border-t border-mirai-border pt-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (selected !== undefined)
                setRevealed((current) => ({ ...current, [lesson.id]: true }));
            }}
          >
            <fieldset disabled={isRevealed}>
              <legend className="text-base font-bold leading-7 text-mirai-text">
                <span className="mb-2 block text-sm text-primary-strong">
                  クイズ
                </span>
                {lesson.quiz.question}
              </legend>
              <div className="mt-4 space-y-3">
                {lesson.quiz.options.map((option, index) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-mirai-border p-4 text-sm leading-7 text-mirai-text has-[:checked]:border-primary-accent has-[:checked]:bg-mirai-surface-light focus-within:ring-2 focus-within:ring-primary/40"
                  >
                    <input
                      type="radio"
                      name={`quiz-${lesson.id}`}
                      value={index}
                      checked={selected === index}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [lesson.id]: index,
                        }))
                      }
                      className="mt-1.5 size-4 shrink-0 accent-primary"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {!isRevealed && (
              <Button
                type="submit"
                disabled={selected === undefined}
                className="mt-5 w-full"
              >
                回答を確認
                <ArrowRight className="size-4" />
              </Button>
            )}
          </form>

          {isRevealed && (
            <section
              role="status"
              aria-live="polite"
              className="mt-6 border-l-2 border-primary-accent pl-4"
            >
              <h2
                ref={explanationRef}
                tabIndex={-1}
                className="scroll-mt-24 text-base font-bold text-primary-strong outline-none"
              >
                {selected === lesson.quiz.correctIndex
                  ? "正解です"
                  : "解説を確認しましょう"}
              </h2>
              <p className="mt-3 text-sm font-bold leading-7 text-mirai-text">
                正解：{String.fromCharCode(65 + lesson.quiz.correctIndex)}
              </p>
              <p className="mt-3 text-sm leading-7 text-mirai-text">
                {lesson.quiz.explanation}
              </p>
              <LearningSources
                sourceRefs={lesson.quiz.sourceRefs}
                sources={sources}
              />
            </section>
          )}
        </article>

        <nav aria-label="学習の移動" className="mt-6 flex flex-col gap-3">
          {isRevealed && (
            <Button
              type="button"
              onClick={
                isLast ? onStartInterview : () => setChapter(chapter + 1)
              }
              className="h-auto min-h-13 whitespace-normal py-3"
            >
              {isLast ? "AIインタビューをはじめる" : "次の章へ"}
              <ArrowRight className="size-4" />
            </Button>
          )}
          {chapter > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setChapter(chapter - 1)}
            >
              <ArrowLeft className="size-4" />
              前の章へ
            </Button>
          )}
          <Button
            type="button"
            variant="link"
            className="mt-3 whitespace-normal leading-6 text-primary-strong"
            onClick={onStartInterview}
          >
            学習を途中で終えてインタビューへ
          </Button>
        </nav>
      </div>
    </div>
  );
}
