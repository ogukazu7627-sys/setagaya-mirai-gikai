import "server-only";

import { ArrowRight, BookOpen, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const budgetTopics = [
  { label: "教育", className: "left-[16%] top-[26%] bg-mirai-info-blue" },
  { label: "子育て", className: "left-[45%] top-[34%] bg-budget-node-mint" },
  { label: "福祉", className: "left-[70%] top-[24%] bg-budget-node-gold" },
  { label: "防災", className: "left-[30%] top-[68%] bg-white" },
  { label: "まちづくり", className: "left-[64%] top-[70%] bg-mirai-surface" },
] as const;

export function HomeBudgetPromo() {
  return (
    <section aria-labelledby="home-budget-heading" className="bg-white pb-12">
      <Container>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2
                id="home-budget-heading"
                className="text-[22px] font-bold leading-[1.48] text-mirai-text"
              >
                世田谷区の予算
              </h2>
              <p className="mt-1.5 text-xs font-medium leading-[1.67] text-mirai-text-secondary">
                暮らしに近いテーマから、区の予算をわかりやすく見られます。
              </p>
            </div>
            <Button asChild variant="outline" className="w-fit">
              <Link href={routes.budget() as Route}>
                予算ページを見る
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border border-mirai-border bg-white shadow-sm">
            <div className="grid gap-0 min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
              <div className="flex flex-col justify-between gap-6 px-5 py-6 sm:px-7 sm:py-8">
                <div>
                  <p className="inline-flex w-fit items-center gap-2 rounded-full bg-mirai-light-gradient px-3 py-1 text-xs font-bold text-primary-strong">
                    <Search aria-hidden="true" className="size-3.5" />
                    触れる予算
                  </p>
                  <h3 className="mt-4 text-xl font-bold leading-[1.55] text-mirai-text sm:text-2xl">
                    教育、子育て、福祉などから予算のつながりを探す
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-[1.8] text-mirai-text-secondary">
                    令和8年度当初予算を、公式分類だけでなく、気になる言葉や暮らしのテーマからたどれます。
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild>
                    <Link href={routes.budget() as Route}>
                      予算マップを開く
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={routes.budgetAll() as Route}>
                      <BookOpen aria-hidden="true" />
                      公式分類で見る
                    </Link>
                  </Button>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="relative min-h-64 overflow-hidden border-t border-mirai-border bg-[linear-gradient(135deg,#f7fbff_0%,#eef9ff_43%,#f7f4f0_100%)] min-[768px]:border-t-0 min-[768px]:border-l"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(125,211,252,0.34),transparent_30%),radial-gradient(circle_at_74%_26%,rgba(253,230,138,0.34),transparent_26%),radial-gradient(circle_at_46%_74%,rgba(167,243,208,0.32),transparent_32%)]" />
                <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
                <div className="absolute top-8 bottom-8 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
                <svg
                  className="absolute inset-0 h-full w-full"
                  role="presentation"
                  focusable="false"
                >
                  <path
                    d="M68 90 C150 42, 220 50, 286 102 S408 166, 492 112"
                    fill="none"
                    stroke="var(--primary)"
                    strokeOpacity="0.24"
                    strokeWidth="2"
                  />
                  <path
                    d="M96 196 C172 150, 254 232, 322 176 S410 112, 500 184"
                    fill="none"
                    stroke="var(--budget-validation)"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                  />
                </svg>
                {budgetTopics.map((topic) => (
                  <span
                    key={topic.label}
                    className={`absolute flex h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 px-3 text-xs font-bold text-mirai-text shadow-[0_10px_28px_rgba(14,165,233,0.16)] ${topic.className}`}
                  >
                    {topic.label}
                  </span>
                ))}
                <div className="absolute right-5 bottom-5 rounded-md border border-mirai-border bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="text-xs font-bold text-mirai-text-secondary">
                    令和8年度当初予算
                  </p>
                  <p className="mt-1 text-lg font-bold text-mirai-text">
                    約6210億円
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
