"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  type CarouselOptions,
} from "@/components/ui/carousel";
import { shouldHandleCouncilorCarouselDrag } from "@/features/bills/client/components/bill-detail/councilor-opinion-chat-section";
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

export type CouncilQuestionCarouselSlide = {
  content: ReactNode;
  councilorId: string;
};

type CouncilQuestionNavigatorProps = {
  activeCouncilorId: string;
  collection: CouncilQuestionCollectionRoute;
  items: CouncilQuestionNavigationItem[];
  slides: CouncilQuestionCarouselSlide[];
};

export function CouncilQuestionNavigator({
  activeCouncilorId,
  collection,
  items,
  slides,
}: CouncilQuestionNavigatorProps) {
  const router = useRouter();
  const activeItemIndex = Math.max(
    0,
    items.findIndex((item) => item.councilorId === activeCouncilorId)
  );
  const activeSlideIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.councilorId === activeCouncilorId)
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(activeSlideIndex);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(activeSlideIndex > 0);
  const [canScrollNext, setCanScrollNext] = useState(
    activeSlideIndex < slides.length - 1
  );
  const currentSlide =
    slides[currentSlideIndex] ?? slides[activeSlideIndex] ?? slides[0];
  const currentItem =
    items.find((item) => item.councilorId === currentSlide?.councilorId) ??
    items[activeItemIndex] ??
    items[0];
  const currentItemIndex = currentItem
    ? items.findIndex((item) => item.councilorId === currentItem.councilorId)
    : -1;
  const hasMultipleCouncilors = items.length > 1 && slides.length > 1;
  const carouselOptions = useMemo<CarouselOptions>(
    () => ({
      align: "start",
      startIndex: activeSlideIndex,
      watchDrag: shouldHandleCouncilorCarouselDrag,
    }),
    [activeSlideIndex]
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
    setCurrentSlideIndex(activeSlideIndex);
    setCanScrollPrev(activeSlideIndex > 0);
    setCanScrollNext(activeSlideIndex < slides.length - 1);
    carouselApi?.scrollTo(activeSlideIndex, true);
  }, [activeSlideIndex, carouselApi, slides.length]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const updateCarouselState = () => {
      setCurrentSlideIndex(carouselApi.selectedScrollSnap());
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };
    const handleSelect = () => {
      updateCarouselState();
      const selectedSlide = slides[carouselApi.selectedScrollSnap()];
      const selectedItem = items.find(
        (item) => item.councilorId === selectedSlide?.councilorId
      );
      if (selectedItem) {
        navigateTo(selectedItem);
      }
    };

    updateCarouselState();
    carouselApi.on("select", handleSelect);
    carouselApi.on("reInit", updateCarouselState);
    return () => {
      carouselApi.off("select", handleSelect);
      carouselApi.off("reInit", updateCarouselState);
    };
  }, [carouselApi, items, navigateTo, slides]);

  if (!(currentItem && currentSlide)) {
    return null;
  }

  return (
    <section
      aria-label="議員ごとの質問と答弁"
      className="mt-8 rounded-md border border-mirai-border bg-white p-4 sm:p-5"
      data-budget-question-navigator={
        collection.kind === "budget" ? "true" : undefined
      }
      data-general-question-navigator={
        collection.kind === "general" ? "true" : undefined
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-mirai-border bg-mirai-surface-gray px-3 py-1 text-sm font-bold text-mirai-text">
            <CouncilorAvatarImage
              alt=""
              aria-hidden="true"
              className="size-8 shrink-0 rounded-full object-cover object-top"
              size={32}
              src={currentItem.councilorIconUrl}
            />
            <span className="truncate">
              {formatCouncilQuestionCouncilorLabel(
                currentItem.councilorDisplayName
              )}
            </span>
          </span>
          <span className="text-xs font-bold text-mirai-text-secondary">
            質問 {currentItem.questionCount}件
          </span>
          {hasMultipleCouncilors && currentItemIndex >= 0 ? (
            <span
              aria-live="polite"
              className="text-xs font-bold text-mirai-text-secondary"
            >
              {currentItemIndex + 1} / {items.length}
            </span>
          ) : null}
        </div>

        {hasMultipleCouncilors ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              aria-label="前の議員を見る"
              className="size-10 rounded-full"
              disabled={!canScrollPrev}
              onClick={() => carouselApi?.scrollPrev()}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Button>
            <Button
              aria-label="次の議員を見る"
              className="size-10 rounded-full"
              disabled={!canScrollNext}
              onClick={() => carouselApi?.scrollNext()}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {hasMultipleCouncilors ? (
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
            value={currentItem.councilorId}
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

      {hasMultipleCouncilors ? (
        <Carousel
          aria-label="議員、会派の意見を切り替える"
          className="mt-6"
          opts={carouselOptions}
          setApi={setCarouselApi}
        >
          <CarouselContent className="cursor-grab touch-pan-y active:cursor-grabbing">
            {slides.map((slide) => {
              const itemIndex = items.findIndex(
                (item) => item.councilorId === slide.councilorId
              );

              return (
                <CarouselItem
                  aria-label={`${itemIndex + 1} / ${items.length}`}
                  key={slide.councilorId}
                >
                  <div
                    className="h-[560px] max-h-[72vh] overflow-y-auto overscroll-contain rounded-md bg-mirai-surface-gray px-3 py-4 touch-pan-y [scrollbar-gutter:stable] md:h-[620px] md:px-4"
                    data-council-question-scroll-region="true"
                    data-council-question-slide={slide.councilorId}
                  >
                    {slide.content}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      ) : (
        <div
          className="mt-6"
          data-council-question-slide={currentSlide.councilorId}
        >
          {currentSlide.content}
        </div>
      )}
    </section>
  );
}
