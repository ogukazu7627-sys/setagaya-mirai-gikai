"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  type CarouselOptions,
} from "@/components/ui/carousel";
import { formatCouncilQuestionCouncilorLabel } from "@/features/bills/shared/utils/council-question-overview";
import { routes } from "@/lib/routes";

export type CouncilQuestionNavigationItem = {
  councilorId: string;
  councilorDisplayName: string;
  councilorIconUrl: string | null;
  firstQuestionId: string;
  questionCount: number;
};

export type CouncilQuestionCollectionRoute =
  | { kind: "budget"; categorySlug: string }
  | { kind: "general"; categoryId: string; year: number };

type CouncilQuestionNavigatorProps = {
  activeCouncilorId: string;
  collection: CouncilQuestionCollectionRoute;
  items: CouncilQuestionNavigationItem[];
};

export function CouncilQuestionNavigator({
  activeCouncilorId,
  collection,
  items,
}: CouncilQuestionNavigatorProps) {
  const router = useRouter();
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.councilorId === activeCouncilorId)
  );
  const activeItem = items[activeIndex] ?? items[0];
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const previousItem = activeIndex > 0 ? items[activeIndex - 1] : null;
  const nextItem =
    activeIndex < items.length - 1 ? items[activeIndex + 1] : null;
  const carouselOptions = useMemo<CarouselOptions>(
    () => ({ align: "start", startIndex: activeIndex }),
    [activeIndex]
  );

  const navigateTo = useCallback(
    (item: CouncilQuestionNavigationItem) => {
      if (item.councilorId === activeCouncilorId) {
        return;
      }
      const href =
        collection.kind === "budget"
          ? routes.budgetQuestionCategory(
              collection.categorySlug,
              item.firstQuestionId
            )
          : routes.generalQuestionCategory(
              collection.year,
              collection.categoryId,
              item.firstQuestionId
            );
      router.push(href as Route, { scroll: false });
    },
    [activeCouncilorId, collection, router]
  );

  useEffect(() => {
    carouselApi?.scrollTo(activeIndex, true);
  }, [activeIndex, carouselApi]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const handleSelect = () => {
      const selectedItem = items[carouselApi.selectedScrollSnap()];
      if (selectedItem) {
        navigateTo(selectedItem);
      }
    };

    carouselApi.on("select", handleSelect);
    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, items, navigateTo]);

  if (!activeItem) {
    return null;
  }

  return (
    <nav
      aria-label="表示する議員"
      className="mt-8 rounded-md border border-mirai-border bg-white p-4 sm:p-5"
      data-budget-question-navigator={
        collection.kind === "budget" ? "true" : undefined
      }
      data-general-question-navigator={
        collection.kind === "general" ? "true" : undefined
      }
    >
      <Carousel
        aria-label="議員、会派の意見を切り替える"
        opts={carouselOptions}
        setApi={setCarouselApi}
      >
        <CarouselContent className="touch-pan-y">
          {items.map((item, index) => (
            <CarouselItem
              aria-label={`${index + 1} / ${items.length}`}
              key={item.councilorId}
            >
              <div className="flex min-h-12 min-w-0 flex-wrap items-center gap-2 pr-24">
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-mirai-border bg-mirai-surface-gray px-3 py-1 text-sm font-bold text-mirai-text">
                  <CouncilorAvatarImage
                    alt=""
                    aria-hidden="true"
                    className="size-8 shrink-0 rounded-full object-cover object-top"
                    size={32}
                    src={item.councilorIconUrl}
                  />
                  <span className="truncate">
                    {formatCouncilQuestionCouncilorLabel(
                      item.councilorDisplayName
                    )}
                  </span>
                </span>
                <span className="text-xs font-bold text-mirai-text-secondary">
                  質問 {item.questionCount}件
                </span>
                {items.length > 1 ? (
                  <span className="text-xs font-bold text-mirai-text-secondary">
                    {index + 1} / {items.length}
                  </span>
                ) : null}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {items.length > 1 ? (
          <div className="absolute right-0 top-1 flex shrink-0 items-center gap-2">
            <Button
              aria-label="前の議員を見る"
              className="size-10 rounded-full"
              disabled={!previousItem}
              onClick={() => previousItem && navigateTo(previousItem)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Button>
            <Button
              aria-label="次の議員を見る"
              className="size-10 rounded-full"
              disabled={!nextItem}
              onClick={() => nextItem && navigateTo(nextItem)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : null}
      </Carousel>

      {items.length > 1 ? (
        <label className="mt-4 block" htmlFor="council-question-selector">
          <span className="mb-2 block text-xs font-bold text-mirai-text-secondary">
            議員を選ぶ
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-mirai-border bg-white px-3 py-2 text-sm text-mirai-text outline-none focus-visible:border-primary-strong focus-visible:ring-2 focus-visible:ring-primary/30"
            id="council-question-selector"
            onChange={(event) => {
              const selectedItem = items.find(
                (item) => item.councilorId === event.target.value
              );
              if (selectedItem) {
                navigateTo(selectedItem);
              }
            }}
            value={activeCouncilorId}
          >
            {items.map((item) => (
              <option key={item.councilorId} value={item.councilorId}>
                {formatCouncilQuestionCouncilorLabel(item.councilorDisplayName)}
                （{item.questionCount}件）
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </nav>
  );
}
