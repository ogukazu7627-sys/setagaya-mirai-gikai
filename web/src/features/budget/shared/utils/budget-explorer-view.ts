import type {
  BudgetExplorationData,
  BudgetExplorerStableView,
} from "../types/budget-exploration";

export function resolveBudgetExplorerView(
  exploration: BudgetExplorationData,
  input: {
    categorySlug: string | null;
    topicSlug: string | null;
  }
): BudgetExplorerStableView {
  if (!input.categorySlug) {
    return { kind: "overview" };
  }

  const category = exploration.categories.find(
    (candidate) => candidate.slug === input.categorySlug
  );
  if (!category) {
    return { kind: "overview" };
  }

  if (!input.topicSlug) {
    return { kind: "category", category };
  }

  const topic = category.topics.find(
    (candidate) => candidate.slug === input.topicSlug
  );
  if (!topic) {
    return { kind: "category", category };
  }

  return { kind: "topic", category, topic };
}

export function getBudgetExplorerAnnouncement(
  view: BudgetExplorerStableView
): string {
  switch (view.kind) {
    case "overview":
      return "10の分野から予算を探せます";
    case "category":
      return `${view.category.name}の課題を表示しています`;
    case "topic":
      return `${view.topic.name}に関連する${view.topic.programs.length}件の予算事業を表示しています`;
  }
}
