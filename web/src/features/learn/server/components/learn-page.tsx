import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { TeamMirai } from "@/components/top/team-mirai";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

export function LearnPage() {
  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-primary-accent">
            区議会を身近に
          </p>
          <h1 className="text-3xl font-bold text-mirai-text">学ぶ</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-mirai-text-secondary">
            このサイトの見方と、世田谷区議会の公式情報へ戻るための入口をまとめています。
          </p>
        </div>

        <section aria-labelledby="learn-start-title" className="mt-8">
          <h2
            id="learn-start-title"
            className="flex items-center gap-3 text-2xl font-bold text-mirai-text"
          >
            <BookOpen
              aria-hidden="true"
              className="size-6 text-primary-accent"
            />
            まず見る
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={routes.bills() as Route}
              className="group flex min-h-20 items-center gap-4 rounded-lg border border-mirai-border bg-white p-4 transition-colors hover:bg-mirai-surface-gray"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-mirai-text">
                  議会の案件を見る
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-mirai-text-secondary">
                  公開中の案件をテーマから探せます。
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
              className="group flex min-h-20 items-center gap-4 rounded-lg border border-mirai-border bg-white p-4 transition-colors hover:bg-mirai-surface-gray"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-mirai-text">
                  世田谷区議会公式
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-mirai-text-secondary">
                  日程、会議録、中継などの公式情報を確認します。
                </span>
              </span>
              <ExternalLink
                aria-hidden="true"
                className="size-5 shrink-0 text-primary-accent"
              />
            </a>
          </div>
        </section>

        <About />
        <TeamMirai />
      </Container>
    </div>
  );
}
