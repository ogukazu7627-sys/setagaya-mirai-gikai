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
  const groupSignature = section.groups
    .map((group) => `${group.groupIndex}:${group.rawHeading}`)
    .join("|");

  useEffect(() => {
    void groupSignature;
    setCurrentIndex(0);
    api?.scrollTo(0, true);
  }, [api, groupSignature]);

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
                <CouncilorCarouselDots
                  currentIndex={currentIndex}
                  groups={section.groups}
                  onSelect={(index) => api?.scrollTo(index)}
                />
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
        <div className="relative -mx-1">
          <Carousel className="px-1" opts={CAROUSEL_OPTIONS} setApi={setApi}>
            <CarouselContent className="-ml-3">
              {section.groups.map((group, index) => (
                <CarouselItem
                  aria-label={`${group.rawHeading} ${index + 1} / ${
                    section.groups.length
                  }`}
                  className="basis-[92%] pl-3 md:basis-[88%]"
                  key={`${group.groupIndex}-${group.rawHeading}`}
                >
                  <CouncilorOpinionChatGroupView
                    group={group}
                    isActive={index === currentIndex}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-1 z-10 w-8 rounded-l-md bg-gradient-to-r from-white via-white/80 to-transparent transition-opacity",
              canScrollPrev ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 right-1 z-10 w-10 rounded-r-md bg-gradient-to-l from-white via-white/80 to-transparent transition-opacity",
              canScrollNext ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      ) : (
        section.groups[0] && (
          <CouncilorOpinionChatGroupView
            group={section.groups[0]}
            isActive={true}
          />
        )
      )}
    </section>
  );
}

function CouncilorCarouselDots({
  groups,
  currentIndex,
  onSelect,
}: {
  groups: CouncilorOpinionChatGroup[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      aria-label="議員・会派の表示位置"
      className="flex items-center gap-1"
      role="group"
    >
      {groups.map((group, index) => (
        <button
          aria-current={index === currentIndex ? "true" : undefined}
          aria-label={`${group.rawHeading}を表示`}
          className={cn(
            "h-2 rounded-full transition-all",
            index === currentIndex
              ? "w-5 bg-primary"
              : "w-2 bg-mirai-border hover:bg-primary/50"
          )}
          key={`${group.groupIndex}-${group.rawHeading}-dot`}
          onClick={() => onSelect(index)}
          type="button"
        />
      ))}
    </div>
  );
}

function CouncilorOpinionChatGroupView({
  group,
  isActive,
}: {
  group: CouncilorOpinionChatGroup;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md bg-mirai-surface-gray px-3 py-4 transition-all md:px-4",
        isActive ? "opacity-100" : "scale-[0.98] opacity-70"
      )}
    >
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
