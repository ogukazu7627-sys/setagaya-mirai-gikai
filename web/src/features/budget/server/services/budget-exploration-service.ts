import "server-only";

import {
  BUDGET_ACCOUNT_CODES,
  BUDGET_EXPLORATION_CATEGORIES,
} from "../../shared/constants/budget";
import type {
  BudgetExplorationCategory,
  BudgetExplorationData,
  BudgetExplorationProgram,
  BudgetExplorationTopic,
} from "../../shared/types/budget-exploration";
import {
  type BudgetExplorationRows,
  findPublishedBudgetExplorationRows,
} from "../repositories/budget-exploration-repository";

const relationTypes = new Set([
  "responds_to",
  "supports",
  "maintains",
  "enables",
]);
const topicKinds = new Set(["problem", "goal", "administrative_function"]);
const accountCodes = new Set<string>(BUDGET_ACCOUNT_CODES);
const categoryToneBySlug = new Map<string, BudgetExplorationCategory["tone"]>(
  BUDGET_EXPLORATION_CATEGORIES.map((category) => [
    category.slug,
    category.tone,
  ])
);
const fallbackTones = ["cyan", "mint", "gold"] as const;

export async function getBudgetExplorationData(): Promise<BudgetExplorationData> {
  return buildBudgetExplorationData(await findPublishedBudgetExplorationRows());
}

export function buildBudgetExplorationData(
  rows: BudgetExplorationRows
): BudgetExplorationData {
  const categories = rows.categories
    .filter((category) => category.status === "published")
    .sort(
      (left, right) =>
        left.sort_order - right.sort_order || left.id.localeCompare(right.id)
    );
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  );
  const topics = rows.topics.filter(
    (topic) => topic.status === "published" && topicKinds.has(topic.topic_kind)
  );
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const categorySlugsByTopicId = new Map<string, Set<string>>();

  for (const relation of rows.topicCategories) {
    const topic = topicById.get(relation.topic_id);
    const category = categoryById.get(relation.category_id);
    if (!topic || !category) {
      continue;
    }
    const categorySlugs =
      categorySlugsByTopicId.get(topic.id) ?? new Set<string>();
    categorySlugs.add(category.slug);
    categorySlugsByTopicId.set(topic.id, categorySlugs);
  }

  const identityById = new Map(
    rows.identities.map((identity) => [
      identity.budget_program_identity_id,
      identity,
    ])
  );
  const publishedRelations = rows.topicPrograms.filter(
    (relation) =>
      rows.activeDatasetId !== null &&
      relation.dataset_id === rows.activeDatasetId &&
      relation.review_status === "published" &&
      relationTypes.has(relation.relation_type) &&
      topicById.has(relation.topic_id) &&
      identityById.has(relation.budget_program_identity_id)
  );
  const categorySlugsByIdentityId = new Map<string, Set<string>>();

  for (const relation of publishedRelations) {
    const categorySlugs =
      categorySlugsByIdentityId.get(relation.budget_program_identity_id) ??
      new Set<string>();
    for (const categorySlug of categorySlugsByTopicId.get(relation.topic_id) ??
      []) {
      categorySlugs.add(categorySlug);
    }
    categorySlugsByIdentityId.set(
      relation.budget_program_identity_id,
      categorySlugs
    );
  }

  const topicModels = new Map<string, BudgetExplorationTopic>();
  for (const topic of topics) {
    const categorySlugs = [
      ...(categorySlugsByTopicId.get(topic.id) ?? []),
    ].sort();
    if (categorySlugs.length === 0) {
      continue;
    }
    const programs = publishedRelations
      .filter((relation) => relation.topic_id === topic.id)
      .map((relation) =>
        buildProgram(
          identityById.get(relation.budget_program_identity_id),
          relation.relation_type,
          categorySlugsByIdentityId.get(relation.budget_program_identity_id)
        )
      )
      .filter(
        (program): program is BudgetExplorationProgram => program !== null
      )
      .sort(
        (left, right) =>
          right.amountThousandYen - left.amountThousandYen ||
          left.budgetProgramIdentityId.localeCompare(
            right.budgetProgramIdentityId
          )
      );

    topicModels.set(topic.id, {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      shortDescription: topic.short_description,
      topicKind: topic.topic_kind as BudgetExplorationTopic["topicKind"],
      categorySlugs,
      programs,
    });
  }

  return {
    activeDatasetId: rows.activeDatasetId,
    availability: "available",
    categories: categories.map(
      (category, index): BudgetExplorationCategory => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        shortDescription: category.short_description,
        sortOrder: category.sort_order,
        tone:
          categoryToneBySlug.get(category.slug) ??
          fallbackTones[index % fallbackTones.length] ??
          "cyan",
        topics: rows.topicCategories
          .filter((relation) => relation.category_id === category.id)
          .sort(
            (left, right) =>
              Number(right.is_primary) - Number(left.is_primary) ||
              right.relevance_weight - left.relevance_weight ||
              left.topic_id.localeCompare(right.topic_id)
          )
          .map((relation) => topicModels.get(relation.topic_id))
          .filter(
            (topic): topic is BudgetExplorationTopic => topic !== undefined
          ),
      })
    ),
  };
}

function buildProgram(
  identity: BudgetExplorationRows["identities"][number] | undefined,
  relationType: string,
  categorySlugs: Set<string> | undefined
): BudgetExplorationProgram | null {
  if (
    !identity ||
    !accountCodes.has(identity.account_code) ||
    !relationTypes.has(relationType) ||
    !Number.isSafeInteger(identity.amount_thousand_yen)
  ) {
    return null;
  }

  return {
    budgetProgramIdentityId: identity.budget_program_identity_id,
    displayProgramName: identity.display_program_name,
    accountCode:
      identity.account_code as BudgetExplorationProgram["accountCode"],
    accountName: identity.account_name,
    kanName: identity.kan_name,
    kouName: identity.kou_name,
    mokuName: identity.moku_name,
    departmentDisplayName: identity.department_display_name,
    amountThousandYen: identity.amount_thousand_yen,
    isZeroAmount: identity.is_zero_amount,
    relationType: relationType as BudgetExplorationProgram["relationType"],
    categorySlugs: [...(categorySlugs ?? [])].sort(),
  };
}
