"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import { Button } from "@/components/ui/button";
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
  const previousItem = activeIndex > 0 ? items[activeIndex - 1] : null;
  const nextItem =
    activeIndex < items.length - 1 ? items[activeIndex + 1] : null;

  if (!activeItem) {
    return null;
  }

  const navigateTo = (item: CouncilQuestionNavigationItem) => {
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
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-mirai-border bg-mirai-surface-gray px-3 py-1 text-sm font-bold text-mirai-text">
            <CouncilorAvatarImage
              alt=""
              aria-hidden="true"
              className="size-8 shrink-0 rounded-full object-cover object-top"
              size={32}
              src={activeItem.councilorIconUrl}
            />
            <span className="truncate">
              {formatCouncilQuestionCouncilorLabel(
                activeItem.councilorDisplayName
              )}
            </span>
          </span>
          <span className="text-xs font-bold text-mirai-text-secondary">
            質問 {activeItem.questionCount}件
          </span>
          {items.length > 1 ? (
            <span
              aria-live="polite"
              className="text-xs font-bold text-mirai-text-secondary"
            >
              {activeIndex + 1} / {items.length}
            </span>
          ) : null}
        </div>

        {items.length > 1 ? (
          <div className="flex shrink-0 items-center gap-2">
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
      </div>

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
