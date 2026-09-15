"use client";

import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MINPAKU_SOURCES } from "../shared/campaign";
import {
  MINPAKU_LEARNING_REVIEWED_AT,
  MINPAKU_LESSONS,
} from "../shared/learning";

function LearningSources({ sourceRefs }: { sourceRefs: readonly string[] }) {
  return (
    <ul
      className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs leading-5 text-primary-accent"
      aria-label="出典"
    >
      {MINPAKU_SOURCES.filter((source) => sourceRefs.includes(source.id)).map(
        (source) => (
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
        )
      )}
    </ul>
  );
}

export function PublicCommentLearning({
  onStartInterview,
  onBack,
}: {
  onStartInterview: () => void;
  onBack: () => void;
}) {
  const [chapter, setChapter] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const explanationRef = useRef<HTMLHeadingElement>(null);
  const lesson = MINPAKU_LESSONS[chapter];
  const selected = answers[lesson.id];
  const isRevealed = revealed[lesson.id] === true;
  const isLast = chapter === MINPAKU_LESSONS.length - 1;

  useEffect(() => {
    if (isRevealed) explanationRef.current?.focus();
  }, [isRevealed]);

  useEffect(() => {
    // Move focus with the chapter so keyboard and screen-reader users follow it.
    if (lesson.id) headingRef.current?.focus();
  }, [lesson.id]);

  return (
    <div className="min-h-dvh bg-mirai-light-gradient px-4 py-8 pb-[calc(var(--mobile-primary-navigation-height,0px)+env(safe-area-inset-bottom,0px)+2rem)]">
      <div className="mx-auto max-w-[560px]">
        <Button type="button" variant="link" className="mb-6" onClick={onBack}>
          <ArrowLeft className="size-4" />
          案内画面に戻る
        </Button>
        <div className="mb-6 flex items-center justify-between gap-4 text-sm font-bold text-primary-accent">
          <span className="inline-flex items-center gap-2">
            <BookOpen className="size-5" />
            条例改正について学ぶ
          </span>
          <span>
            <span className="sr-only">章：</span>
            {chapter + 1} / {MINPAKU_LESSONS.length}
          </span>
        </div>
        <Progress
          value={((chapter + 1) / MINPAKU_LESSONS.length) * 100}
          aria-label="学習の進捗"
          className="mb-6 h-[7px] bg-mirai-progress-track"
        />
        <article className="rounded-2xl bg-white p-6">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="scroll-mt-24 text-[22px] font-bold leading-relaxed text-mirai-text outline-none"
          >
            {lesson.title}
          </h1>
          <p className="mt-2 text-xs text-mirai-text-secondary">
            資料確認日：{MINPAKU_LEARNING_REVIEWED_AT}
          </p>
          {lesson.sections.map((section) => (
            <section key={section.label} className="mt-6">
              <h2 className="text-sm font-bold leading-6 text-primary-accent">
                {section.label}
              </h2>
              <p className="mt-2 text-[15px] leading-8 text-mirai-text">
                {section.body}
              </p>
              <LearningSources sourceRefs={section.sourceRefs} />
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
                <span className="mb-2 block text-sm text-primary-accent">
                  理解を確認
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
                className="scroll-mt-24 text-base font-bold text-primary-accent outline-none"
              >
                {selected === lesson.quiz.correctIndex
                  ? "正解です"
                  : "解説を確認しましょう"}
              </h2>
              <p className="mt-3 text-sm font-bold leading-7 text-mirai-text">
                正解：{lesson.quiz.options[lesson.quiz.correctIndex]}
              </p>
              <p className="mt-3 text-sm leading-7 text-mirai-text">
                {lesson.quiz.explanation}
              </p>
              <p className="mt-3 text-xs text-mirai-text-secondary">
                資料確認日：{MINPAKU_LEARNING_REVIEWED_AT}
              </p>
              <LearningSources sourceRefs={lesson.quiz.sourceRefs} />
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
            className="mt-3 whitespace-normal leading-6"
            onClick={onStartInterview}
          >
            学習を途中で終えてインタビューへ
          </Button>
        </nav>
      </div>
    </div>
  );
}
