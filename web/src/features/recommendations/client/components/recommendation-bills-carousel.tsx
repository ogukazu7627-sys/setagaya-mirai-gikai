"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  type CarouselOptions,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { BillCard } from "@/features/bills/client/components/bill-list/bill-card";
import type { BillCardData } from "@/features/bills/shared/types";
import {
  readComponentState,
  writeComponentState,
} from "@/features/public-view-state/client/utils/public-view-state-storage";
import { routes } from "@/lib/routes";

type RecommendationBillsCarouselProps = {
  bills: BillCardData[];
  onBillViewed?: (billId: string) => void;
};

const CAROUSEL_OPTIONS: CarouselOptions = {
  align: "center",
  loop: true,
};

const PERSISTENCE_KEY = "home-recommendation-carousel";

type StoredRecommendationCarouselState = {
  billId: string;
};

function isStoredRecommendationCarouselState(
  value: unknown
): value is StoredRecommendationCarouselState {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<StoredRecommendationCarouselState>).billId ===
      "string"
  );
}

export function RecommendationBillsCarousel({
  bills,
  onBillViewed,
}: RecommendationBillsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    const stored = readComponentState(
      PERSISTENCE_KEY,
      isStoredRecommendationCarouselState
    );
    const restoredIndex = stored
      ? bills.findIndex((bill) => bill.id === stored.billId)
      : -1;
    if (restoredIndex > 0) {
      api.scrollTo(restoredIndex, true);
    }

    const updateSelection = () => {
      const nextIndex = api.selectedScrollSnap();
      setSelectedIndex(nextIndex);
      const selectedBill = bills[nextIndex];
      if (selectedBill) {
        writeComponentState(PERSISTENCE_KEY, { billId: selectedBill.id });
        onBillViewed?.(selectedBill.id);
      }
    };

    updateSelection();
    api.on("select", updateSelection);
    api.on("reInit", updateSelection);

    return () => {
      api.off("select", updateSelection);
      api.off("reInit", updateSelection);
    };
  }, [api, bills, onBillViewed]);

  return (
    <Carousel
      aria-label="今日のおすすめ案件"
      className="w-full pb-12"
      opts={CAROUSEL_OPTIONS}
      setApi={setApi}
    >
      <CarouselContent className="-ml-2">
        {bills.map((bill, index) => (
          <CarouselItem
            key={bill.id}
            aria-label={`${index + 1} / ${bills.length}`}
            className="flex basis-[86%] max-w-[634px] pl-2"
          >
            <Link
              href={routes.billDetail(bill.id) as Route}
              aria-current={index === selectedIndex ? "true" : undefined}
              onFocus={() => api?.scrollTo(index)}
              className="block h-full w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2"
            >
              <BillCard
                bill={bill}
                className="h-full max-w-none rounded-md shadow-sm"
              />
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      <p
        aria-live="polite"
        className="absolute bottom-0 left-0 flex h-9 items-center text-xs font-bold text-mirai-text-secondary"
      >
        {selectedIndex + 1} / {bills.length}
      </p>

      {bills.length > 1 && (
        <>
          <CarouselPrevious
            aria-label="前のおすすめを見る"
            className="top-auto right-12 bottom-0 left-auto size-9 translate-y-0 border-mirai-border bg-white shadow-sm hover:bg-mirai-surface-gray"
          />
          <CarouselNext
            aria-label="次のおすすめを見る"
            className="top-auto right-0 bottom-0 size-9 translate-y-0 border-mirai-border bg-white shadow-sm hover:bg-mirai-surface-gray"
          />
        </>
      )}
    </Carousel>
  );
}
