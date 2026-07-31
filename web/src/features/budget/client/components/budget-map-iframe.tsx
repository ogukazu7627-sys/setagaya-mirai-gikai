"use client";

import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isLoaded, setIsLoaded] = useState(false);
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

  const handleLoad = () => {
    setIsLoaded(true);
    syncView();
  };

  return (
    <div
      className="budget-map-frame-shell overflow-hidden"
      aria-busy={!isLoaded}
      data-map-loaded={isLoaded}
    >
      <iframe
        ref={iframeRef}
        src={routes.budgetMap()}
        title="触れる予算の探索マップ"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="same-origin"
        data-explorer-state={view.kind}
        onLoad={handleLoad}
        className={cn(
          "budget-map-frame block w-full border-0",
          `budget-map-frame-${stableView.kind}`,
          !isLoaded && "budget-map-frame-loading"
        )}
      />
      {!isLoaded && (
        <div className="budget-map-loading-scrim absolute inset-0 z-20 flex items-center justify-center text-budget-space-copy">
          <div
            role="status"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-4 motion-safe:animate-spin"
            />
            予算宇宙を準備しています
          </div>
        </div>
      )}
    </div>
  );
}
