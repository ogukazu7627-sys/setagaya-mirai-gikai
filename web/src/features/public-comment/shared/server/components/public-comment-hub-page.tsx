import "server-only";

import {
  Accessibility,
  ArrowRight,
  Bike,
  Brain,
  CalendarDays,
  HandHeart,
  HeartHandshake,
  HeartPulse,
  House,
  Info,
  type LucideIcon,
  MessageSquareText,
  Mountain,
  Scale,
  School,
} from "lucide-react";
import Link from "next/link";
import {
  PUBLIC_COMMENT_CAMPAIGNS,
  type PublicCommentCampaignIcon,
} from "@/features/public-comment/shared/public-comment-campaigns";

const campaignIcons: Record<PublicCommentCampaignIcon, LucideIcon> = {
  accessibility: Accessibility,
  brain: Brain,
  care: HandHeart,
  community: HeartHandshake,
  equality: Scale,
  health: HeartPulse,
  house: House,
  mountain: Mountain,
  school: School,
  traffic: Bike,
};

const deadlineFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Tokyo",
});

export function PublicCommentHubPage() {
  return (
    <div className="min-h-dvh bg-[#f7f9fa] pb-16 sm:pb-20">
      <section className="border-b border-mirai-border bg-white">
        <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-bold text-primary-strong">
            <MessageSquareText aria-hidden="true" className="size-5" />
            みらい議会＠世田谷
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-mirai-text sm:text-4xl">
            AIパブコメインタビュー
          </h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-mirai-text-secondary sm:text-base sm:leading-8">
            AIの質問に答えながら、自分の経験や考えを整理し、世田谷区へ届ける意見の下書きをつくれます。気になるテーマからお選びください。
          </p>
          <p className="mt-5 flex max-w-3xl items-start gap-2 rounded-md bg-mirai-surface-gray px-4 py-3 text-sm leading-6 text-mirai-text-secondary">
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary-strong"
            />
            ここで作成した意見は自動送信されません。内容をご自身で確認し、世田谷区の公式フォームから提出します。
          </p>
        </div>
      </section>

      <section
        aria-labelledby="public-comment-campaigns-heading"
        className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary-strong">意見募集中</p>
            <h2
              id="public-comment-campaigns-heading"
              className="mt-1 text-2xl font-bold text-mirai-text"
            >
              テーマを選ぶ
            </h2>
          </div>
          <p className="shrink-0 text-sm font-bold text-mirai-text-secondary">
            全{PUBLIC_COMMENT_CAMPAIGNS.length}件
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {PUBLIC_COMMENT_CAMPAIGNS.map((campaign) => {
            const Icon = campaignIcons[campaign.icon];

            return (
              <li key={campaign.href}>
                <article className="flex h-full flex-col rounded-lg border border-mirai-border bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-4">
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
                  <h3 className="mt-2 text-lg font-bold leading-[1.65] text-mirai-text sm:text-xl">
                    {campaign.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-mirai-text-secondary">
                    {campaign.description}
                  </p>

                  <p className="mt-5 flex items-center gap-2 border-t border-mirai-border pt-4 text-sm font-medium text-mirai-text-secondary">
                    <CalendarDays
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary-accent"
                    />
                    意見募集
                    <time dateTime={campaign.deadline}>
                      {deadlineFormatter.format(new Date(campaign.deadline))}
                    </time>
                    まで
                  </p>

                  <Link
                    href={campaign.href}
                    className="group mt-5 flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-accent px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2"
                  >
                    AIインタビューをはじめる
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
