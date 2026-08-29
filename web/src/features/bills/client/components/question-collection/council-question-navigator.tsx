"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  type CarouselOptions,
} from "@/components/ui/carousel";
import { shouldHandleCouncilorCarouselDrag } from "@/features/bills/client/components/bill-detail/councilor-opinion-chat-section";
import {
  CouncilorOpinionPanel,
  CouncilorOpinionScrollRegion,
} from "@/features/bills/client/components/bill-detail/councilor-opinion-panel";
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
  const [currentIndex, setCurrentIndex] = useState(activeItemIndex);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const currentIndexRef = useRef(activeItemIndex);
  const suppressedSelectIndexRef = useRef<number | null>(null);
  const lastRequestedCouncilorIdRef = useRef(activeCouncilorId);
  const slideByCouncilorId = useMemo(
    () => new Map(slides.map((slide) => [slide.councilorId, slide])),
    [slides]
  );
  const currentItem = items[currentIndex] ?? items[activeItemIndex] ?? items[0];
  const hasMultipleCouncilors = items.length > 1;
  const carouselOptions = useMemo<CarouselOptions>(
    () => ({
      align: "start",
      skipSnaps: false,
      startIndex: activeItemIndex,
      watchDrag: shouldHandleCouncilorCarouselDrag,
    }),
    [activeItemIndex]
  );

  const navigateTo = useCallback(
    (item: CouncilQuestionNavigationItem) => {
      if (item.councilorId === lastRequestedCouncilorIdRef.current) {
        return;
      }
      lastRequestedCouncilorIdRef.current = item.councilorId;
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
    [collection, router]
  );

  useEffect(() => {
    currentIndexRef.current = activeItemIndex;
    lastRequestedCouncilorIdRef.current = activeCouncilorId;
    setCurrentIndex(activeItemIndex);

    if (carouselApi && carouselApi.selectedScrollSnap() !== activeItemIndex) {
      suppressedSelectIndexRef.current = activeItemIndex;
      carouselApi.scrollTo(activeItemIndex, true);
    }
  }, [activeCouncilorId, activeItemIndex, carouselApi]);

  const selectIndex = useCallback(
    (requestedIndex: number) => {
      const targetIndex = Math.max(
        0,
        Math.min(requestedIndex, items.length - 1)
      );
      if (targetIndex === currentIndexRef.current) {
        return;
      }

      currentIndexRef.current = targetIndex;
      setCurrentIndex(targetIndex);
      const targetItem = items[targetIndex];
      if (targetItem) {
        navigateTo(targetItem);
      }

      if (carouselApi && carouselApi.selectedScrollSnap() !== targetIndex) {
        suppressedSelectIndexRef.current = targetIndex;
        carouselApi.scrollTo(targetIndex);
      }
    },
    [carouselApi, items, navigateTo]
  );

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const handleSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      if (suppressedSelectIndexRef.current === selectedIndex) {
        suppressedSelectIndexRef.current = null;
        return;
      }

      suppressedSelectIndexRef.current = null;
      const previousIndex = currentIndexRef.current;
      if (selectedIndex === previousIndex) {
        return;
      }

      // A single swipe or keyboard action always advances exactly one councilor.
      const targetIndex =
        previousIndex + (selectedIndex > previousIndex ? 1 : -1);
      selectIndex(targetIndex);
    };

    carouselApi.on("select", handleSelect);
    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, selectIndex]);

  if (!currentItem) {
    return null;
  }

  const councilorSelector = hasMultipleCouncilors ? (
    <label className="block" htmlFor="council-question-selector">
      <span className="mb-2 block text-xs font-bold text-mirai-text-secondary">
        議員を選ぶ
      </span>
      <select
        className="min-h-11 w-full rounded-md border border-mirai-border bg-white px-3 py-2 text-sm text-mirai-text outline-none focus-visible:border-primary-strong focus-visible:ring-2 focus-visible:ring-primary/30"
        id="council-question-selector"
        onChange={(event) => {
          const selectedIndex = items.findIndex(
            (item) => item.councilorId === event.target.value
          );
          if (selectedIndex >= 0) {
            selectIndex(selectedIndex);
          }
        }}
        value={currentItem.councilorId}
      >
        {items.map((item) => (
          <option key={item.councilorId} value={item.councilorId}>
            {`${formatCouncilQuestionCouncilorLabel(item.councilorDisplayName)}（${item.questionCount}件）`}
          </option>
        ))}
      </select>
    </label>
  ) : null;

  return (
    <CouncilorOpinionPanel
      aria-label="議員ごとの質問と答弁"
      canGoNext={currentIndex < items.length - 1}
      canGoPrevious={currentIndex > 0}
      className="mt-8"
      currentIndex={currentIndex}
      data-budget-question-navigator={
        collection.kind === "budget" ? "true" : undefined
      }
      data-general-question-navigator={
        collection.kind === "general" ? "true" : undefined
      }
      heading="議員、会派の意見"
      headingLevel="h2"
      nextLabel="次の議員を見る"
      onNext={() => selectIndex(currentIndexRef.current + 1)}
      onPrevious={() => selectIndex(currentIndexRef.current - 1)}
      person={{
        displayName: formatCouncilQuestionCouncilorLabel(
          currentItem.councilorDisplayName
        ),
        iconUrl: currentItem.councilorIconUrl,
      }}
      previousLabel="前の議員を見る"
      selector={councilorSelector}
      totalCount={items.length}
    >
      {hasMultipleCouncilors ? (
        <Carousel
          aria-label="議員、会派の意見を切り替える"
          opts={carouselOptions}
          setApi={setCarouselApi}
        >
          <CarouselContent className="cursor-grab touch-pan-y active:cursor-grabbing">
            {items.map((item, itemIndex) => {
              const slide = slideByCouncilorId.get(item.councilorId);

              return (
                <CarouselItem
                  aria-label={`${itemIndex + 1} / ${items.length}`}
                  key={item.councilorId}
                >
                  <CouncilorOpinionScrollRegion
                    data-council-question-scroll-region="true"
                    data-council-question-slide={item.councilorId}
                    data-council-question-slide-loaded={
                      slide ? "true" : "false"
                    }
                    fixedHeight
                  >
                    {slide?.content ?? (
                      <p className="py-10 text-center text-sm text-mirai-text-secondary">
                        質問を読み込んでいます
                      </p>
                    )}
                  </CouncilorOpinionScrollRegion>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      ) : (
        <CouncilorOpinionScrollRegion
          data-council-question-slide={currentItem.councilorId}
          scroll={false}
        >
          {slideByCouncilorId.get(currentItem.councilorId)?.content}
        </CouncilorOpinionScrollRegion>
      )}
    </CouncilorOpinionPanel>
  );
}
