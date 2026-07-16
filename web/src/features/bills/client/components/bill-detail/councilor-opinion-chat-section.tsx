"use client";

import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type {
  CouncilorOpinionChatGroup,
  CouncilorOpinionChatMessage,
  CouncilorOpinionChatSection as CouncilorOpinionChatSectionData,
} from "@/lib/markdown/extract-councilor-opinion-chat-section";
import { cn } from "@/lib/utils";

type CouncilorOpinionChatSectionProps = {
  section: CouncilorOpinionChatSectionData;
};

const CAROUSEL_OPTIONS = { align: "start", watchDrag: false } as const;

export function CouncilorOpinionChatSection({
  section,
}: CouncilorOpinionChatSectionProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const hasMultipleGroups = section.groups.length > 1;
  const currentGroup = section.groups[currentIndex] ?? section.groups[0];

  useEffect(() => {
    if (!api) {
      return;
    }

    const updateCarouselState = () => {
      setCurrentIndex(api.selectedScrollSnap());
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    updateCarouselState();
    api.on("select", updateCarouselState);
    api.on("reInit", updateCarouselState);

    return () => {
      api.off("select", updateCarouselState);
      api.off("reInit", updateCarouselState);
    };
  }, [api]);

  return (
    <section
      className="!break-normal bg-white px-4 py-8 rounded-md mb-9"
      data-councilor-opinion-chat
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="!mb-3 text-2xl font-bold text-mirai-text">
            {section.title}
          </h1>
          {currentGroup != null && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-mirai-border bg-mirai-surface-gray px-3 py-1 text-sm font-bold text-mirai-text">
                <CouncilorAvatar group={currentGroup} size="sm" />
                <span className="min-w-0 truncate">
                  {currentGroup.rawHeading}
                </span>
              </span>
              {hasMultipleGroups && (
                <span className="text-xs font-bold text-mirai-text-secondary">
                  {currentIndex + 1} / {section.groups.length}
                </span>
              )}
            </div>
          )}
        </div>

        {hasMultipleGroups && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              aria-label="前の議員・会派を見る"
              className="size-9"
              disabled={!canScrollPrev}
              onClick={() => api?.scrollPrev()}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              aria-label="次の議員・会派を見る"
              className="size-9"
              disabled={!canScrollNext}
              onClick={() => api?.scrollNext()}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {hasMultipleGroups ? (
        <Carousel opts={CAROUSEL_OPTIONS} setApi={setApi}>
          <CarouselContent>
            {section.groups.map((group) => (
              <CarouselItem key={`${group.groupIndex}-${group.rawHeading}`}>
                <CouncilorOpinionChatGroupView group={group} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        section.groups[0] && (
          <CouncilorOpinionChatGroupView group={section.groups[0]} />
        )
      )}
    </section>
  );
}

function CouncilorOpinionChatGroupView({
  group,
}: {
  group: CouncilorOpinionChatGroup;
}) {
  return (
    <div className="rounded-md bg-mirai-surface-gray px-3 py-4 md:px-4">
      <div className="space-y-4">
        {group.messages.map((message) => (
          <CouncilorOpinionChatMessageView
            group={group}
            key={`${message.messageIndex}-${message.rawSpeaker}`}
            message={message}
          />
        ))}
      </div>
    </div>
  );
}

function CouncilorOpinionChatMessageView({
  group,
  message,
}: {
  group: CouncilorOpinionChatGroup;
  message: CouncilorOpinionChatMessage;
}) {
  const isQuestioner = message.side === "questioner";

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isQuestioner ? "justify-start" : "flex-row-reverse justify-start"
      )}
    >
      {isQuestioner ? (
        <CouncilorAvatar group={group} size="md" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-mirai-border bg-white text-mirai-text-secondary">
          <Building2 className="size-5" />
        </div>
      )}
      <div
        className={cn(
          "flex min-w-0 max-w-[82%] flex-col",
          isQuestioner ? "items-start" : "items-end"
        )}
      >
        <div className="mb-1 max-w-full truncate text-xs font-bold text-mirai-text-secondary">
          {message.rawSpeaker}
        </div>
        <div
          className={cn(
            "whitespace-pre-line rounded-md px-4 py-3 text-sm font-medium leading-7 text-mirai-text",
            isQuestioner
              ? "border border-mirai-border bg-white"
              : "bg-mirai-info-blue"
          )}
        >
          {message.bodyText}
        </div>
      </div>
    </div>
  );
}

function CouncilorAvatar({
  group,
  size,
}: {
  group: CouncilorOpinionChatGroup;
  size: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white",
        size === "sm" ? "size-8" : "size-11"
      )}
      data-councilor-avatar
    >
      <Image
        src={group.iconUrl}
        alt=""
        fill
        sizes={size === "sm" ? "32px" : "44px"}
        className="object-cover object-top"
      />
    </span>
  );
}
