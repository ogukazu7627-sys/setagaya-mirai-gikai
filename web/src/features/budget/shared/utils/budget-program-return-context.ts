import type { Route } from "next";
import { routes } from "@/lib/routes";
import { BUDGET_EXPLORATION_CATEGORIES } from "../constants/budget";
import type { BudgetProgramTopicRelation } from "../types/budget";
import type { BudgetProgramReturnContext } from "../types/budget-exploration";

type SearchParamValue = string | string[] | undefined;

const topicSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const categorySlugs = new Set<string>(
  BUDGET_EXPLORATION_CATEGORIES.map((category) => category.slug)
);

export function parseBudgetProgramReturnContext(searchParams: {
  fromCategory?: SearchParamValue;
  fromTopic?: SearchParamValue;
}): BudgetProgramReturnContext | null {
  const categorySlug = readSingleValue(searchParams.fromCategory);
  if (!categorySlug || !categorySlugs.has(categorySlug)) {
    return null;
  }

  const topicSlug = readSingleValue(searchParams.fromTopic);
  if (
    !topicSlug ||
    topicSlug.length > 100 ||
    !topicSlugPattern.test(topicSlug)
  ) {
    return { categorySlug };
  }

  return { categorySlug, topicSlug };
}

export function resolveBudgetProgramReturnDestination(
  returnContext: BudgetProgramReturnContext | null,
  publishedTopics: ReadonlyArray<
    Pick<BudgetProgramTopicRelation, "slug" | "name" | "categories">
  >
): { href: Route; label: string } {
  if (!returnContext) {
    return { href: routes.budget(), label: "触れる予算へ戻る" };
  }

  const category = BUDGET_EXPLORATION_CATEGORIES.find(
    (candidate) => candidate.slug === returnContext.categorySlug
  );
  if (!category) {
    return { href: routes.budget(), label: "触れる予算へ戻る" };
  }

  const topic = returnContext.topicSlug
    ? publishedTopics.find(
        (candidate) =>
          candidate.slug === returnContext.topicSlug &&
          candidate.categories.some(
            (candidateCategory) =>
              candidateCategory.slug === returnContext.categorySlug
          )
      )
    : undefined;
  if (topic) {
    return {
      href: routes.budgetTopic(category.slug, topic.slug),
      label: `「${topic.name}」へ戻る`,
    };
  }

  return {
    href: routes.budgetCategory(category.slug),
    label: `「${category.name}」へ戻る`,
  };
}

function readSingleValue(value: SearchParamValue): string | null {
  return typeof value === "string" ? value : null;
}
