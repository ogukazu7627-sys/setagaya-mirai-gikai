"use client";

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
  Mountain,
  Scale,
  School,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  type CarouselOptions,
  CarouselPrevious,
} from "@/components/ui/carousel";

const campaignIcons = {
  accessibility: Accessibility,
  brain: Brain,
  care: HandHeart,
  community: HeartHandshake,
  health: HeartPulse,
  house: House,
  mountain: Mountain,
  equality: Scale,
  school: School,
  traffic: Bike,
} as const;

export type HomePublicCommentCampaign = {
  label: string;
  title: string;
  description: string;
  deadline: string;
  href: Route;
  icon: keyof typeof campaignIcons;
};

type HomePublicCommentCarouselProps = {
  campaigns: readonly HomePublicCommentCampaign[];
};

const CAROUSEL_OPTIONS: CarouselOptions = {
  align: "start",
  containScroll: "trimSnaps",
  loop: false,
};

const deadlineFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Tokyo",
});

export function HomePublicCommentCarousel({
  campaigns,
}: HomePublicCommentCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <Carousel
      aria-label="AIパブコメインタビュー一覧"
      className="w-full pb-12"
      opts={CAROUSEL_OPTIONS}
      setApi={setApi}
    >
      <CarouselContent className="-ml-3 touch-pan-y items-stretch">
        {campaigns.map((campaign, index) => {
          const Icon = campaignIcons[campaign.icon];

          return (
            <CarouselItem
              key={campaign.href}
              aria-label={`${index + 1} / ${campaigns.length}`}
              className="flex basis-[86%] pl-3 sm:basis-[48%] lg:basis-[32%]"
            >
              <Link
                href={campaign.href}
                onFocus={() => api?.scrollTo(index)}
                className="group flex h-full w-full flex-col rounded-md border border-mirai-border bg-white p-5 transition-colors hover:bg-mirai-surface-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2"
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
            </CarouselItem>
          );
        })}
      </CarouselContent>

      <p className="absolute bottom-0 left-0 flex h-9 items-center text-xs font-bold text-mirai-text-secondary">
        全{campaigns.length}件
      </p>

      {campaigns.length > 1 && (
        <>
          <CarouselPrevious
            aria-label="前のAIパブコメインタビューを見る"
            className="top-auto right-12 bottom-0 left-auto hidden size-9 translate-y-0 border-mirai-border bg-white shadow-sm hover:bg-mirai-surface-gray md:inline-flex"
          />
          <CarouselNext
            aria-label="次のAIパブコメインタビューを見る"
            className="top-auto right-0 bottom-0 hidden size-9 translate-y-0 border-mirai-border bg-white shadow-sm hover:bg-mirai-surface-gray md:inline-flex"
          />
        </>
      )}
    </Carousel>
  );
}

function formatDeadline(deadline: string) {
  return deadlineFormatter.format(new Date(deadline));
}
