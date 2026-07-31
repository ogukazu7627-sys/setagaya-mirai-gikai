"use client";

import { useCallback, useEffect, useRef } from "react";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type {
  BudgetExplorationData,
  BudgetExplorerView,
} from "../../shared/types/budget-exploration";
import { getBudgetMapStableView } from "../../shared/utils/budget-map-layout";
import {
  createBudgetMapHostMessage,
  parseBudgetMapMessage,
} from "../../shared/utils/budget-map-message";

type BudgetMapIframeProps = {
  exploration: BudgetExplorationData;
  view: BudgetExplorerView;
  onBack: () => void;
  onFocusSearch: () => void;
  onOpenOfficialHierarchy: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectProgram: (budgetProgramIdentityId: string) => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
};

export function BudgetMapIframe({
  exploration,
  view,
  onBack,
  onFocusSearch,
  onOpenOfficialHierarchy,
  onSelectCategory,
  onSelectProgram,
  onSelectTopic,
}: BudgetMapIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stableView = getBudgetMapStableView(view);
  const syncView = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      createBudgetMapHostMessage(view),
      window.location.origin
    );
  }, [view]);

  useEffect(() => {
    syncView();
  }, [syncView]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }
      const message = parseBudgetMapMessage(event.data);
      if (!message) {
        return;
      }

      switch (message.action) {
        case "ready":
          syncView();
          return;
        case "back":
          onBack();
          return;
        case "focus-search":
          onFocusSearch();
          return;
        case "open-official-hierarchy":
          onOpenOfficialHierarchy();
          return;
        case "select-category":
          if (
            exploration.categories.some(
              (category) => category.slug === message.categorySlug
            )
          ) {
            onSelectCategory(message.categorySlug);
          }
          return;
        case "select-topic": {
          const category = exploration.categories.find(
            (candidate) => candidate.slug === message.categorySlug
          );
          if (
            category?.topics.some((topic) => topic.slug === message.topicSlug)
          ) {
            onSelectTopic(message.categorySlug, message.topicSlug);
          }
          return;
        }
        case "select-program":
          if (
            exploration.categories.some((category) =>
              category.topics.some((topic) =>
                topic.programs.some(
                  (program) =>
                    program.budgetProgramIdentityId ===
                    message.budgetProgramIdentityId
                )
              )
            )
          ) {
            onSelectProgram(message.budgetProgramIdentityId);
          }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    exploration,
    onBack,
    onFocusSearch,
    onOpenOfficialHierarchy,
    onSelectCategory,
    onSelectProgram,
    onSelectTopic,
    syncView,
  ]);

  return (
    <div className="budget-map-frame-shell overflow-hidden">
      <iframe
        ref={iframeRef}
        src={routes.budgetMap()}
        title="触れる予算の探索マップ"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="same-origin"
        data-explorer-state={view.kind}
        onLoad={syncView}
        className={cn(
          "budget-map-frame block w-full border-0",
          `budget-map-frame-${stableView.kind}`
        )}
      />
    </div>
  );
}
