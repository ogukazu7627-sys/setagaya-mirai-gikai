"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BudgetExplorationData,
  BudgetExplorerStableView,
  BudgetExplorerView,
} from "../../shared/types/budget-exploration";
import { getBudgetExplorerAnnouncement } from "../../shared/utils/budget-explorer-view";
import { getBudgetMapStableView } from "../../shared/utils/budget-map-layout";
import {
  type BudgetMapAction,
  createBudgetMapMessage,
  parseBudgetMapHostMessage,
  resolveBudgetMapViewReference,
} from "../../shared/utils/budget-map-message";
import {
  BUDGET_MAP_DEFAULT_VARIANT,
  type BudgetMapVariant,
} from "../../shared/utils/budget-map-variant";
import { BudgetMapV2Network } from "./budget-map-v2/budget-map-v2-network";
import { BudgetNetwork } from "./budget-network";

type BudgetMapEmbedProps = {
  exploration: BudgetExplorationData;
  initialView: BudgetExplorerStableView;
  /** 既定は v2。v1 は比較用に残している。 */
  variant?: BudgetMapVariant;
};

export function BudgetMapEmbed({
  exploration,
  initialView,
  variant = BUDGET_MAP_DEFAULT_VARIANT,
}: BudgetMapEmbedProps) {
  const [view, setView] = useState<BudgetExplorerView>(initialView);
  const stableView = getBudgetMapStableView(view);
  const activeDatasetId = exploration.activeDataset?.id ?? null;

  const postAction = useCallback(
    (action: BudgetMapAction) => {
      window.parent.postMessage(
        createBudgetMapMessage(action, activeDatasetId),
        window.location.origin
      );
    },
    [activeDatasetId]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent
      ) {
        return;
      }
      const message = parseBudgetMapHostMessage(event.data);
      if (!message) {
        return;
      }
      if (message.activeDatasetId !== activeDatasetId) {
        postAction({ action: "dataset-mismatch" });
        return;
      }
      const nextView = resolveBudgetMapViewReference(exploration, message.view);
      if (nextView) {
        setView(nextView);
      }
    };
    window.addEventListener("message", handleMessage);
    postAction({ action: "ready" });
    return () => window.removeEventListener("message", handleMessage);
  }, [activeDatasetId, exploration, postAction]);

  const selectCategory = useCallback(
    (slug: string) => {
      const category = exploration.categories.find(
        (candidate) => candidate.slug === slug
      );
      if (!category || view.kind === "transitioning") {
        return;
      }
      postAction({ action: "select-category", categorySlug: slug });
    },
    [exploration.categories, postAction, view.kind]
  );

  const selectTopic = useCallback(
    (categorySlug: string, topicSlug: string) => {
      const category = exploration.categories.find(
        (candidate) => candidate.slug === categorySlug
      );
      const topic = category?.topics.find(
        (candidate) => candidate.slug === topicSlug
      );
      if (!category || !topic || view.kind === "transitioning") {
        return;
      }
      postAction({
        action: "select-topic",
        categorySlug,
        topicSlug,
      });
    },
    [exploration.categories, postAction, view.kind]
  );

  const selectProgram = useCallback(
    (budgetProgramIdentityId: string) => {
      if (view.kind === "transitioning") {
        return;
      }
      postAction({
        action: "select-program",
        budgetProgramIdentityId,
      });
    },
    [postAction, view.kind]
  );

  const goBack = useCallback(() => {
    if (view.kind === "transitioning" || stableView.kind === "overview") {
      return;
    }
    postAction({ action: "back" });
  }, [postAction, stableView.kind, view.kind]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }
      if (view.kind === "transitioning" || stableView.kind === "overview") {
        return;
      }
      event.preventDefault();
      goBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, stableView.kind, view.kind]);

  const networkProps = {
    exploration,
    view,
    onBack: goBack,
    onFocusSearch: () => postAction({ action: "focus-search" }),
    onOpenOfficialHierarchy: () =>
      postAction({ action: "open-official-hierarchy" }),
    onSelectCategory: selectCategory,
    onSelectProgram: selectProgram,
    onSelectTopic: selectTopic,
  };

  return (
    <div
      className="budget-map-embed-root h-svh min-h-full w-full overflow-hidden"
      data-map-variant={variant}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {getBudgetExplorerAnnouncement(stableView)}
      </div>
      {variant === "v2" ? (
        <BudgetMapV2Network {...networkProps} />
      ) : (
        <BudgetNetwork {...networkProps} />
      )}
    </div>
  );
}
