import "server-only";

import {
  Accessibility,
  ArrowRight,
  CalendarDays,
  House,
  School,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { DISABILITY_SUBMISSION_DEADLINE } from "@/features/public-comment/disability/shared/campaign";
import { IJIME_SUBMISSION_DEADLINE } from "@/features/public-comment/ijime/shared/campaign";
import { MINPAKU_SUBMISSION_DEADLINE } from "@/features/public-comment/minpaku/shared/campaign";
import { routes } from "@/lib/routes";

const campaigns = [
  {
    label: "民泊・旅館業",
    title: "民泊・旅館業の条例改正素案",
    description:
      "暮らしと観光の両立や、民泊・旅館業の新しいルールについて考えます。",
    deadline: MINPAKU_SUBMISSION_DEADLINE,
    href: routes.publicCommentMinpaku() as Route,
    icon: House,
  },
  {
    label: "子ども・いじめ",
    title: "いじめの予防と解消に向けた条例素案",
    description:
      "子どもの意向と安全、予防・相談・支援の仕組みについて考えます。",
    deadline: IJIME_SUBMISSION_DEADLINE,
    href: routes.publicCommentIjime() as Route,
    icon: School,
  },
  {
    label: "障害理解・地域共生",
    title: "障害理解・地域共生条例の改正素案",
    description:
      "暮らしの選択や意思決定支援、区政参加のあり方について考えます。",
    deadline: DISABILITY_SUBMISSION_DEADLINE,
    href: routes.publicCommentDisability() as Route,
    icon: Accessibility,
  },
] as const;

const deadlineFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Tokyo",
});

export function HomePublicCommentSection() {
  return (
    <section
      aria-labelledby="home-public-comment-heading"
      className="bg-mirai-surface py-10 md:py-12"
    >
      <Container>
        <div className="flex flex-col gap-6">
          <div className="flex items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h2
                id="home-public-comment-heading"
                className="text-[22px] font-bold leading-[1.48] text-mirai-text"
              >
                AIパブコメインタビュー
              </h2>
              <p className="mt-1.5 text-sm font-medium leading-[1.8] text-mirai-text-secondary">
                AIの質問に答えながら考えを整理し、世田谷区へ提出する意見の下書きをつくれます。提出はご自身で公式フォームから行います。
              </p>
            </div>
            <Image
              src="/illustrations/interview-illustration.png"
              width={580}
              height={745}
              alt=""
              sizes="112px"
              className="hidden h-32 w-auto shrink-0 object-contain object-bottom md:block"
            />
          </div>

          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {campaigns.map((campaign) => {
              const Icon = campaign.icon;

              return (
                <li key={campaign.href}>
                  <Link
                    href={campaign.href}
                    className="group flex h-full flex-col rounded-md border border-mirai-border bg-white p-5 transition-colors hover:bg-mirai-surface-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mirai-light-gradient text-primary-strong">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="rounded-full bg-mirai-surface-tag px-2.5 py-1 text-xs font-bold text-mirai-text-secondary">
                        募集中
                      </span>
                    </div>

                    <p className="mt-5 text-xs font-bold text-primary-strong">
                      {campaign.label}
                    </p>
                    <h3 className="mt-2 text-lg font-bold leading-[1.65] text-mirai-text">
                      {campaign.title}
                    </h3>
                    <p className="mt-3 text-sm leading-[1.75] text-mirai-text-secondary">
                      {campaign.description}
                    </p>

                    <div className="mt-auto pt-5">
                      <p className="flex items-center gap-2 text-xs font-medium text-mirai-text-secondary">
                        <CalendarDays
                          aria-hidden="true"
                          className="size-4 shrink-0 text-primary-accent"
                        />
                        意見募集 {formatDeadline(campaign.deadline)}まで
                      </p>
                      <span className="mt-4 flex items-center justify-between gap-3 border-t border-mirai-border pt-4 text-sm font-bold text-primary-strong">
                        インタビューを見る
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}

function formatDeadline(deadline: string) {
  return deadlineFormatter.format(new Date(deadline));
}
