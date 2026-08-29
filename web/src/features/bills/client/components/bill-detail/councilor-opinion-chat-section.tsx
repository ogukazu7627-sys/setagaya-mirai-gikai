"use client";

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  type CarouselOptions,
} from "@/components/ui/carousel";
import {
  readComponentState,
  writeComponentState,
} from "@/features/public-view-state/client/utils/public-view-state-storage";
import {
  getCouncilorStatementAnchorId,
  getCouncilorStatementIndexFromHash,
} from "@/lib/councilor-statement-anchor";
import type {
  CouncilorOpinionChatGroup,
  CouncilorOpinionChatMessage,
  CouncilorOpinionChatSection as CouncilorOpinionChatSectionData,
} from "@/lib/markdown/extract-councilor-opinion-chat-section";
import { cn } from "@/lib/utils";
import {
  CouncilorOpinionPanel,
  CouncilorOpinionScrollRegion,
} from "./councilor-opinion-panel";

type CouncilorOpinionChatSectionProps = {
  persistenceKey?: string;
  scrollSingleGroup?: boolean;
  section: CouncilorOpinionChatSectionData;
};

type StoredCouncilorOpinionState = {
  rawHeading: string;
};

function isStoredCouncilorOpinionState(
  value: unknown
): value is StoredCouncilorOpinionState {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<StoredCouncilorOpinionState>).rawHeading ===
      "string"
  );
}

const CHAT_BUBBLE_SELECTOR = "[data-councilor-chat-bubble]";
type CouncilorAvatarLoading = "eager" | "lazy";
type CarouselWatchDrag = Exclude<
  NonNullable<CarouselOptions>["watchDrag"],
  boolean | undefined
>;

export const shouldHandleCouncilorCarouselDrag: CarouselWatchDrag = (
  _api,
  event
) => {
  const target = event.target;

  if (target instanceof Element && target.closest(CHAT_BUBBLE_SELECTOR)) {
    return false;
  }

  return true;
};

const CAROUSEL_OPTIONS: CarouselOptions = {
  align: "start",
  watchDrag: shouldHandleCouncilorCarouselDrag,
};

export function CouncilorOpinionChatSection({
  persistenceKey,
  scrollSingleGroup = false,
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
    if (!api) {
      return;
    }

    void groupSignature;
    const stored = persistenceKey
      ? readComponentState(persistenceKey, isStoredCouncilorOpinionState)
      : null;
    const restoredIndex = stored
      ? section.groups.findIndex(
          (group) => group.rawHeading === stored.rawHeading
        )
      : -1;
    const initialIndex = restoredIndex >= 0 ? restoredIndex : 0;

    const updateCarouselState = () => {
      const nextIndex = api.selectedScrollSnap();
      setCurrentIndex(nextIndex);
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
      const selectedGroup = section.groups[nextIndex];
      if (persistenceKey && selectedGroup) {
        writeComponentState(persistenceKey, {
          rawHeading: selectedGroup.rawHeading,
        });
      }
    };

    // Restore before subscribing so the carousel's initial index cannot
    // overwrite the saved selection during setup.
    api.scrollTo(initialIndex, true);
    setCurrentIndex(initialIndex);
    setCanScrollPrev(initialIndex > 0);
    setCanScrollNext(initialIndex < section.groups.length - 1);
    api.on("select", updateCarouselState);
    api.on("reInit", updateCarouselState);

    return () => {
      api.off("select", updateCarouselState);
      api.off("reInit", updateCarouselState);
    };
  }, [api, groupSignature, persistenceKey, section.groups]);

  useEffect(() => {
    const revealHashTarget = () => {
      const statementIndex = getCouncilorStatementIndexFromHash(
        window.location.hash
      );
      if (statementIndex === null) {
        return;
      }

      const carouselIndex = section.groups.findIndex(
        (group) => group.groupIndex === statementIndex
      );
      if (carouselIndex === -1) {
        return;
      }

      setCurrentIndex(carouselIndex);
      api?.scrollTo(carouselIndex, true);
      window.requestAnimationFrame(() => {
        document
          .getElementById(getCouncilorStatementAnchorId(statementIndex))
          ?.scrollIntoView({ block: "start" });
      });
    };

    revealHashTarget();
    window.addEventListener("hashchange", revealHashTarget);

    return () => {
      window.removeEventListener("hashchange", revealHashTarget);
    };
  }, [api, section.groups]);

  return (
    <CouncilorOpinionPanel
      canGoNext={canScrollNext}
      canGoPrevious={canScrollPrev}
      currentIndex={currentIndex}
      heading={section.title}
      onNext={() => api?.scrollNext()}
      onPrevious={() => api?.scrollPrev()}
      person={
        currentGroup
          ? {
              displayName: currentGroup.rawHeading,
              iconUrl: currentGroup.iconUrl,
            }
          : null
      }
      totalCount={section.groups.length}
    >
      {hasMultipleGroups ? (
        <Carousel opts={CAROUSEL_OPTIONS} setApi={setApi}>
          <CarouselContent>
            {section.groups.map((group, index) => (
              <CarouselItem key={`${group.groupIndex}-${group.rawHeading}`}>
                <CouncilorOpinionChatGroupView
                  anchorId={getCouncilorStatementAnchorId(group.groupIndex)}
                  avatarLoading={index === currentIndex ? "eager" : "lazy"}
                  group={group}
                  isFixedHeightScrollRegion
                  isScrollRegion
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        section.groups[0] && (
          <CouncilorOpinionChatGroupView
            anchorId={getCouncilorStatementAnchorId(
              section.groups[0].groupIndex
            )}
            avatarLoading="eager"
            group={section.groups[0]}
            isScrollRegion={scrollSingleGroup}
          />
        )
      )}
    </CouncilorOpinionPanel>
  );
}

function CouncilorOpinionChatGroupView({
  anchorId,
  avatarLoading = "lazy",
  group,
  isFixedHeightScrollRegion = false,
  isScrollRegion = false,
}: {
  anchorId: string;
  avatarLoading?: CouncilorAvatarLoading;
  group: CouncilorOpinionChatGroup;
  isFixedHeightScrollRegion?: boolean;
  isScrollRegion?: boolean;
}) {
  return (
    <CouncilorOpinionScrollRegion
      className="scroll-mt-24 target:ring-2 target:ring-primary-accent target:ring-offset-2 target:ring-offset-white"
      fixedHeight={isFixedHeightScrollRegion}
      id={anchorId}
      scroll={isScrollRegion}
    >
      <CouncilorOpinionChatMessages
        avatarLoading={avatarLoading}
        group={group}
      />
    </CouncilorOpinionScrollRegion>
  );
}

export function CouncilorOpinionChatMessages({
  avatarLoading = "lazy",
  group,
}: {
  avatarLoading?: CouncilorAvatarLoading;
  group: CouncilorOpinionChatGroup;
}) {
  return (
    <div className="space-y-4" data-councilor-opinion-chat-messages>
      {group.messages.map((message) => (
        <CouncilorOpinionChatMessageView
          avatarLoading={avatarLoading}
          group={group}
          key={`${message.messageIndex}-${message.rawSpeaker}`}
          message={message}
        />
      ))}
    </div>
  );
}

function CouncilorOpinionChatMessageView({
  avatarLoading,
  group,
  message,
}: {
  avatarLoading: CouncilorAvatarLoading;
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
        <CouncilorAvatar group={group} loading={avatarLoading} size="md" />
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
          data-councilor-chat-bubble
          className={cn(
            "whitespace-pre-line rounded-md px-4 py-3 text-sm font-medium leading-7 text-mirai-text select-text",
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
  loading = "lazy",
  size,
}: {
  group: CouncilorOpinionChatGroup;
  loading?: CouncilorAvatarLoading;
  size: "sm" | "md";
}) {
  const avatarSize = size === "sm" ? 32 : 44;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white",
        size === "sm" ? "size-8" : "size-11"
      )}
      data-councilor-avatar
    >
      <CouncilorAvatarImage
        src={group.iconUrl}
        alt=""
        loading={loading}
        size={avatarSize}
        className="size-full object-cover object-top"
      />
    </span>
  );
}
