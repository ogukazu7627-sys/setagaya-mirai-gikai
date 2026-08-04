import "server-only";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

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
              <div className="flex min-h-64 flex-col justify-center gap-7 px-6 py-8 sm:px-8 min-[768px]:min-h-0">
                <h3 className="text-[26px] font-bold leading-[1.55] text-mirai-text sm:text-[32px]">
                  <span className="block">予算を</span>
                  <span className="block">見やすく</span>
                  <span className="block">分かりやすく</span>
                </h3>
                <Button asChild className="w-fit">
                  <Link href={routes.budget() as Route}>
                    予算マップを開く
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              <div className="border-t border-mirai-border bg-[#06283a] min-[768px]:border-t-0 min-[768px]:border-l">
                <Image
                  src="/images/budget-home-map.jpg"
                  width={1179}
                  height={1402}
                  alt="令和8年度当初予算 世田谷区の予算マップ"
                  className="h-auto w-full"
                  sizes="(min-width: 768px) 360px, 100vw"
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
