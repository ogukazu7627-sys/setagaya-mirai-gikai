"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CouncilorOpinionPanelPerson = {
  displayName: string;
  iconUrl: string | null;
};

type CouncilorOpinionPanelProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children" | "title"
> & {
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  children: ReactNode;
  currentIndex?: number;
  heading: string;
  headingLevel?: "h1" | "h2";
  nextLabel?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  person: CouncilorOpinionPanelPerson | null;
  previousLabel?: string;
  selector?: ReactNode;
  totalCount?: number;
};

export function CouncilorOpinionPanel({
  canGoNext = false,
  canGoPrevious = false,
  children,
  className,
  currentIndex = 0,
  heading,
  headingLevel = "h1",
  nextLabel = "次の議員・会派を見る",
  onNext,
  onPrevious,
  person,
  previousLabel = "前の議員・会派を見る",
  selector,
  totalCount = 1,
  ...sectionProps
}: CouncilorOpinionPanelProps) {
  const Heading = headingLevel;
  const hasMultiplePeople = totalCount > 1;

  return (
    <section
      {...sectionProps}
      className={cn(
        "!break-normal mb-9 rounded-md bg-white px-4 py-8",
        className
      )}
      data-councilor-opinion-chat
      data-councilor-opinion-panel="true"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Heading className="!mb-3 text-2xl font-bold text-mirai-text">
            {heading}
          </Heading>
          {person ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-mirai-border bg-mirai-surface-gray px-3 py-1 text-sm font-bold text-mirai-text">
                <span
                  aria-hidden="true"
                  className="relative inline-flex size-8 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white"
                  data-councilor-avatar
                >
                  <CouncilorAvatarImage
                    alt=""
                    className="size-full object-cover object-top"
                    loading="eager"
                    size={32}
                    src={person.iconUrl}
                  />
                </span>
                <span className="min-w-0 truncate">{person.displayName}</span>
              </span>
              {hasMultiplePeople ? (
                <span
                  aria-live="polite"
                  className="text-xs font-bold text-mirai-text-secondary"
                >
                  {currentIndex + 1} / {totalCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasMultiplePeople ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              aria-label={previousLabel}
              className="size-9"
              disabled={!canGoPrevious}
              onClick={onPrevious}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Button>
            <Button
              aria-label={nextLabel}
              className="size-9"
              disabled={!canGoNext}
              onClick={onNext}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {selector ? <div className="mb-6">{selector}</div> : null}
      {children}
    </section>
  );
}

type CouncilorOpinionScrollRegionProps = ComponentPropsWithoutRef<"div"> & {
  fixedHeight?: boolean;
  scroll?: boolean;
};

export function CouncilorOpinionScrollRegion({
  children,
  className,
  fixedHeight = false,
  scroll = true,
  ...props
}: CouncilorOpinionScrollRegionProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-md bg-mirai-surface-gray px-3 py-4 md:px-4",
        scroll &&
          "max-h-[72vh] overflow-y-auto overscroll-contain touch-pan-y [scrollbar-gutter:stable]",
        scroll && fixedHeight && "h-[560px] md:h-[620px]",
        className
      )}
      data-councilor-chat-scroll-region={scroll ? "true" : undefined}
    >
      {children}
    </div>
  );
}
