"use client";

import {
  type CouncilQuestionCarouselSlide,
  type CouncilQuestionNavigationItem,
  CouncilQuestionNavigator,
} from "@/features/bills/client/components/question-collection/council-question-navigator";

export type BudgetQuestionCouncilorNavigationItem =
  CouncilQuestionNavigationItem;

type BudgetQuestionNavigatorProps = {
  activeCouncilorId: string;
  categorySlug: string;
  items: BudgetQuestionCouncilorNavigationItem[];
  slides: CouncilQuestionCarouselSlide[];
};

export function BudgetQuestionNavigator({
  activeCouncilorId,
  categorySlug,
  items,
  slides,
}: BudgetQuestionNavigatorProps) {
  return (
    <CouncilQuestionNavigator
      activeCouncilorId={activeCouncilorId}
      collection={{ kind: "budget", categorySlug }}
      items={items}
      slides={slides}
    />
  );
}
