import type { Metadata } from "next";
import { BudgetMapEmbed } from "@/features/budget/client/components/budget-map-embed";
import { loadBudgetExploration } from "@/features/budget/server/loaders/load-budget-exploration";
import {
  BUDGET_MAP_SAMPLE_QUESTION_PARAM,
  getBudgetMapSampleQuestions,
  shouldShowBudgetMapSampleQuestions,
} from "@/features/budget/shared/utils/budget-map-sample-questions";
import {
  BUDGET_MAP_VARIANT_PARAM,
  parseBudgetMapVariant,
} from "@/features/budget/shared/utils/budget-map-variant";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "触れる予算マップ",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BudgetMapRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [exploration, resolvedSearchParams] = await Promise.all([
    loadBudgetExploration(),
    searchParams,
  ]);
  return (
    <BudgetMapEmbed
      exploration={exploration}
      initialView={{ kind: "overview" }}
      questions={getBudgetMapSampleQuestions(
        shouldShowBudgetMapSampleQuestions(
          resolvedSearchParams[BUDGET_MAP_SAMPLE_QUESTION_PARAM]
        )
      )}
      variant={parseBudgetMapVariant(
        resolvedSearchParams[BUDGET_MAP_VARIANT_PARAM]
      )}
    />
  );
}
