import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  budgetAdministrativeCoverageTopicSlugs,
  budgetInitialConcreteTopicSlugs,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";
import { readBudgetTopicReviewFile } from "./budget-topic-review";

const definitionsDirectory = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);
const reviewDirectory = fileURLToPath(
  new URL("../../../data/budget/editorial/review", import.meta.url)
);

describe("budget administrative coverage topics", () => {
  it("全1,156 identityの分類元候補を保持するが広域topicは公開しない", () => {
    const coverageSlugs = new Set<string>(
      budgetAdministrativeCoverageTopicSlugs
    );
    const definitions = loadBudgetTopicDefinitions(definitionsDirectory).filter(
      (definition) => coverageSlugs.has(definition.topic.slug)
    );
    const reviews = definitions.map((definition) => ({
      definition,
      review: readBudgetTopicReviewFile(
        path.join(reviewDirectory, definition.topic.reviewFile)
      ),
    }));
    const rows = reviews.flatMap(({ review }) => review.rows);
    const initialTopicIdentityIds = new Set(
      loadBudgetTopicDefinitions(definitionsDirectory)
        .filter((definition) =>
          budgetInitialConcreteTopicSlugs.includes(
            definition.topic
              .slug as (typeof budgetInitialConcreteTopicSlugs)[number]
          )
        )
        .flatMap((definition) =>
          readBudgetTopicReviewFile(
            path.join(reviewDirectory, definition.topic.reviewFile)
          ).rows.map((row) => row.budget_program_identity_id)
        )
    );

    expect(definitions).toHaveLength(10);
    expect(
      definitions.every(
        (definition) => definition.topic.publicationStatus === "archived"
      )
    ).toBe(true);
    expect(new Set(definitions.map((row) => row.categorySlug)).size).toBe(10);
    expect(rows).toHaveLength(1_156);
    expect(
      new Set(rows.map((row) => row.budget_program_identity_id)).size
    ).toBe(1_156);
    expect(initialTopicIdentityIds.size).toBe(175);
    expect(
      rows.filter(
        (row) => !initialTopicIdentityIds.has(row.budget_program_identity_id)
      )
    ).toHaveLength(981);
    expect(
      rows.every(
        (row) =>
          row.evidence_level === "B_strong_structural" &&
          row.confidence === "high" &&
          row.review_decision === "reject" &&
          row.review_note.startsWith("[publication-policy]")
      )
    ).toBe(true);
    expect(
      Object.fromEntries(
        reviews.map(({ definition, review }) => [
          definition.categorySlug,
          review.rows.length,
        ])
      )
    ).toEqual({
      education: 124,
      "child-rearing": 88,
      welfare: 352,
      "urban-development": 147,
      "disaster-prevention": 25,
      "administration-finance": 116,
      "culture-sports": 85,
      industry: 42,
      environment: 48,
      "daily-life": 129,
    });
  });
});
