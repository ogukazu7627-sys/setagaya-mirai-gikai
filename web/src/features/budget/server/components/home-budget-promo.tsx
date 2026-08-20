import "server-only";

import { ArrowRight, Sparkles } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const budgetThemes = ["教育", "子育て", "福祉", "防災"] as const;

export function HomeBudgetPromo() {
  return (
    <section aria-labelledby="home-budget-heading" className="bg-white pb-12">
      <Container>
        <div className="flex flex-col gap-6">
          <h2
            id="home-budget-heading"
            className="text-[22px] font-bold leading-[1.48] text-mirai-text"
          >
            世田谷区の予算
          </h2>

          <div className="overflow-hidden rounded-md border border-mirai-border bg-white shadow-sm">
            <div className="grid items-stretch gap-0 min-[768px]:grid-cols-[minmax(0,1fr)_minmax(260px,0.84fr)]">
              <div className="flex min-h-64 flex-col justify-center gap-6 px-6 py-8 sm:px-8 min-[768px]:min-h-0">
                <div className="max-w-md">
                  <p className="inline-flex w-fit items-center gap-2 rounded-full bg-mirai-light-gradient px-3 py-1 text-xs font-bold text-primary-strong">
                    <Sparkles aria-hidden="true" className="size-3.5" />
                    触れる予算
                  </p>
                  <h3 className="mt-4 text-[26px] font-bold leading-[1.55] text-mirai-text sm:text-[32px]">
                    予算を見やすく、
                    <br />
                    分かりやすく
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-[1.8] text-mirai-text-secondary">
                    教育・子育て・福祉など、暮らしに近いテーマから世田谷区の予算をたどれます。
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {budgetThemes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-mirai-surface-tag px-3 py-1 text-xs font-bold text-mirai-text-secondary"
                    >
                      {theme}
                    </span>
                  ))}
                </div>

                <Button asChild className="w-fit">
                  <Link href={routes.budget() as Route}>
                    予算マップを開く
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              {/* 画像も予算ページへの入口にする。
                  ボタンと同じ遷移先なので、読み上げでは重複させない。 */}
              <Link
                href={routes.budget() as Route}
                aria-hidden="true"
                tabIndex={-1}
                className="block border-t border-mirai-border bg-budget-space-deep transition-opacity hover:opacity-90 min-[768px]:border-t-0 min-[768px]:border-l"
              >
                <Image
                  src="/images/budget-home-map.jpg"
                  width={1179}
                  height={1402}
                  alt=""
                  className="h-auto w-full"
                  sizes="(min-width: 768px) 360px, 100vw"
                />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
