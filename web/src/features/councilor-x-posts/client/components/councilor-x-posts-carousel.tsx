"use client";

import Script from "next/script";
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
import type { PublicCouncilorXPost } from "../../shared/types/councilor-x-post";
import {
  getNextXEmbedCount,
  INITIAL_X_EMBED_COUNT,
} from "../utils/lazy-embed-count";
import { XEmbeddedPost } from "./x-embedded-post";

type CouncilorXPostsCarouselProps = {
  posts: PublicCouncilorXPost[];
};

const CAROUSEL_OPTIONS: CarouselOptions = {
  align: "start",
  containScroll: "trimSnaps",
  loop: false,
};

export function CouncilorXPostsCarousel({
  posts,
}: CouncilorXPostsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [embedCount, setEmbedCount] = useState(() =>
    Math.min(INITIAL_X_EMBED_COUNT, posts.length)
  );
  const [widgetsStatus, setWidgetsStatus] = useState<
    "loading" | "ready" | "failed"
  >(() =>
    typeof window !== "undefined" && window.twttr?.widgets ? "ready" : "loading"
  );

  useEffect(() => {
    if (!api) {
      return;
    }

    const updateSelection = () => {
      const selected = api.selectedScrollSnap();
      setSelectedIndex(selected);
    };
    const loadAfterMovement = () => {
      const selected = api.selectedScrollSnap();
      setSelectedIndex(selected);
      setEmbedCount((currentCount) =>
        getNextXEmbedCount({
          currentCount,
          furthestVisibleIndex: selected,
          totalCount: posts.length,
        })
      );
    };

    updateSelection();
    api.on("select", loadAfterMovement);
    api.on("reInit", updateSelection);

    return () => {
      api.off("select", loadAfterMovement);
      api.off("reInit", updateSelection);
    };
  }, [api, posts.length]);

  useEffect(() => {
    if (widgetsStatus !== "loading") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setWidgetsStatus((current) =>
        current === "loading" ? "failed" : current
      );
    }, 15_000);
    return () => window.clearTimeout(timeoutId);
  }, [widgetsStatus]);

  return (
    <>
      <Script
        id="x-widgets-js"
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onReady={() =>
          setWidgetsStatus(window.twttr?.widgets ? "ready" : "failed")
        }
        onError={() => setWidgetsStatus("failed")}
      />

      <Carousel
        aria-label="世田谷区議会議員の最新X投稿"
        className="w-full pb-12"
        opts={CAROUSEL_OPTIONS}
        setApi={setApi}
      >
        <CarouselContent className="-ml-3 touch-pan-y items-start">
          {posts.map((post, index) => (
            <CarouselItem
              key={post.postId}
              aria-label={`${index + 1} / ${posts.length}`}
              className="self-start basis-[88%] overflow-hidden pl-3 sm:basis-[min(550px,78%)]"
            >
              <XEmbeddedPost
                post={post}
                shouldLoad={index < embedCount}
                widgetsStatus={widgetsStatus}
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        <p
          aria-live="polite"
          className="absolute bottom-0 left-0 flex h-9 items-center text-xs font-bold text-mirai-text-secondary"
        >
          {selectedIndex + 1} / {posts.length}
        </p>

        {posts.length > 1 && (
          <>
            <CarouselPrevious
              aria-label="前の投稿を見る"
              className="top-auto right-12 bottom-0 left-auto hidden size-9 translate-y-0 border-mirai-border bg-white shadow-sm hover:bg-mirai-surface-gray md:inline-flex"
            />
            <CarouselNext
              aria-label="次の投稿を見る"
              className="top-auto right-0 bottom-0 hidden size-9 translate-y-0 border-mirai-border bg-white shadow-sm hover:bg-mirai-surface-gray md:inline-flex"
            />
          </>
        )}
      </Carousel>
    </>
  );
}
