import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Landmark,
  LibraryBig,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { About } from "@/components/top/about";
import { TeamMirai } from "@/components/top/team-mirai";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";
import {
  ESSENTIAL_LESSONS,
  LEARN_CATEGORY_LABELS,
  TOPIC_LESSONS,
} from "../../shared/learn-lessons";
import { LearnLessonCard } from "./learn-lesson-card";

export function LearnPage() {
  return (
    <main className="min-h-dvh bg-[#fbfcfc]">
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-sm font-bold text-primary-accent">
            世田谷区議会を身近に
          </p>
          <h1 className="text-4xl font-bold text-mirai-text sm:text-5xl">
            学ぶ
          </h1>
          <p className="text-[15px] leading-7 text-mirai-text-secondary sm:text-base">
            区議会のしくみや、議案が決まるまでの流れを、世田谷区の公式情報をもとにやさしく学べます。
          </p>
        </div>

        <section
          aria-labelledby="learn-essential-title"
          className="mt-10 sm:mt-14"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-primary-accent">
                <BookOpen aria-hidden="true" className="size-5" />
                はじめの一歩
              </p>
              <h2
                id="learn-essential-title"
                className="mt-2 text-2xl font-bold text-mirai-text"
              >
                {LEARN_CATEGORY_LABELS.essential}
              </h2>
            </div>
            <span className="shrink-0 text-sm font-bold text-mirai-text-muted">
              {ESSENTIAL_LESSONS.length}本
            </span>
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ESSENTIAL_LESSONS.map((lesson, index) => (
              <li key={lesson.slug}>
                <LearnLessonCard lesson={lesson} number={index + 1} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="learn-topic-title" className="mt-14 sm:mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-primary-accent">
                <LibraryBig aria-hidden="true" className="size-5" />
                気になるところから
              </p>
              <h2
                id="learn-topic-title"
                className="mt-2 text-2xl font-bold text-mirai-text"
              >
                {LEARN_CATEGORY_LABELS.topic}
              </h2>
            </div>
            <span className="shrink-0 text-sm font-bold text-mirai-text-muted">
              {TOPIC_LESSONS.length}本
            </span>
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPIC_LESSONS.map((lesson) => (
              <li key={lesson.slug}>
                <LearnLessonCard lesson={lesson} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="learn-explore-title"
        className="border-y border-mirai-border bg-white"
      >
        <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <p className="text-sm font-bold text-primary-accent">学んだあとに</p>
          <h2
            id="learn-explore-title"
            className="mt-2 text-2xl font-bold text-mirai-text"
          >
            実際の議会を見てみる
          </h2>
          <div className="mt-6 grid border-y border-mirai-border sm:grid-cols-3 sm:divide-x sm:divide-mirai-border">
            <Link
              href={routes.bills() as Route}
              className="group flex min-h-28 items-center gap-4 border-b border-mirai-border px-1 py-5 transition-colors hover:bg-mirai-surface-gray sm:border-b-0 sm:px-5"
            >
              <BookOpen
                aria-hidden="true"
                className="size-7 shrink-0 text-primary-accent"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-mirai-text">
                  案件を読む
                </span>
                <span className="mt-1 block text-sm leading-6 text-mirai-text-secondary">
                  議案や質問をテーマから探す
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 text-primary-accent"
              />
            </Link>
            <Link
              href={routes.committees() as Route}
              className="group flex min-h-28 items-center gap-4 border-b border-mirai-border px-1 py-5 transition-colors hover:bg-mirai-surface-gray sm:border-b-0 sm:px-5"
            >
              <Landmark
                aria-hidden="true"
                className="size-7 shrink-0 text-primary-accent"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-mirai-text">
                  委員会を見る
                </span>
                <span className="mt-1 block text-sm leading-6 text-mirai-text-secondary">
                  分野ごとの担当議員を知る
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 text-primary-accent"
              />
            </Link>
            <a
              href={EXTERNAL_LINKS.SETAGAYA_COUNCIL}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-28 items-center gap-4 px-1 py-5 transition-colors hover:bg-mirai-surface-gray sm:px-5"
            >
              <ExternalLink
                aria-hidden="true"
                className="size-7 shrink-0 text-primary-accent"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-mirai-text">
                  公式情報で確かめる
                </span>
                <span className="mt-1 block text-sm leading-6 text-mirai-text-secondary">
                  日程、会議録、中継へ進む
                </span>
              </span>
              <ExternalLink
                aria-hidden="true"
                className="size-5 shrink-0 text-primary-accent"
              />
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6 lg:px-8">
        <About />
        <TeamMirai />
      </div>
    </main>
  );
}
