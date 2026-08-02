import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadBudgetTopicDefinitions } from "./budget-topic-definitions";
import {
  assertPublishedBudgetTopicsMatchReviews,
  loadBudgetTopicPublishExpectations,
  type PublishedBudgetTopicVerificationSnapshot,
} from "./verify-reviewed-budget-topics";

const definitionsPath = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);
const reviewPath = fileURLToPath(
  new URL("../../../data/budget/editorial/review", import.meta.url)
);

function buildMatchingSnapshot(): PublishedBudgetTopicVerificationSnapshot {
  const expectations = loadBudgetTopicPublishExpectations(
    loadBudgetTopicDefinitions(definitionsPath),
    reviewPath
  );
  const categoryIds = new Map<string, string>();
  const categories = expectations.flatMap(({ definition }) => {
    if (categoryIds.has(definition.categorySlug)) {
      return [];
    }
    const id = `category-${definition.categorySlug}`;
    categoryIds.set(definition.categorySlug, id);
    return [{ id, slug: definition.categorySlug, status: "published" }];
  });
  const topics = expectations.map(({ definition }) => ({
    id: `topic-${definition.topic.slug}`,
    slug: definition.topic.slug,
    status: "published",
  }));
  const topicCategories = expectations.map(({ definition }) => ({
    topic_id: `topic-${definition.topic.slug}`,
    category_id: categoryIds.get(definition.categorySlug) as string,
  }));
  const relations = expectations.flatMap(({ definition, review }) =>
    review.selectedRows.map((row) => ({
      topic_id: `topic-${definition.topic.slug}`,
      budget_program_identity_id: row.budget_program_identity_id,
      relation_type: row.proposed_relation_type,
      explanation: row.proposed_explanation,
      evidence_level: row.evidence_level,
      evidence_fields: row.evidence_fields,
      review_status: "published",
      reviewed_by: "11111111-1111-4111-8111-111111111111",
      reviewed_at: "2026-08-03T12:00:00+09:00",
    }))
  );
  return {
    activeDatasetId: "22222222-2222-4222-8222-222222222222",
    categories,
    topics,
    topicCategories,
    relations,
  };
}

describe("reviewed budget topic production verification", () => {
  it("提出済み10topicを167公開・8除外として検証する", () => {
    const expectations = loadBudgetTopicPublishExpectations(
      loadBudgetTopicDefinitions(definitionsPath),
      reviewPath
    );

    expect(
      expectations.reduce(
        (sum, expectation) => sum + expectation.review.selectedRows.length,
        0
      )
    ).toBe(167);
    expect(
      expectations.reduce(
        (sum, expectation) => sum + expectation.review.rejectedRows.length,
        0
      )
    ).toBe(8);
    expect(
      assertPublishedBudgetTopicsMatchReviews(
        expectations,
        buildMatchingSnapshot()
      )
    ).toEqual({
      datasetId: "22222222-2222-4222-8222-222222222222",
      topicCount: 10,
      publishedRelationCount: 167,
      rejectedRelationCount: 8,
    });
  });

  it("承認済みidentityの欠落を拒否する", () => {
    const expectations = loadBudgetTopicPublishExpectations(
      loadBudgetTopicDefinitions(definitionsPath),
      reviewPath
    );
    const snapshot = buildMatchingSnapshot();
    snapshot.relations.shift();

    expect(() =>
      assertPublishedBudgetTopicsMatchReviews(expectations, snapshot)
    ).toThrow("公開件数が不一致");
  });

  it("reject済みidentityが公開関係に残る状態を拒否する", () => {
    const expectations = loadBudgetTopicPublishExpectations(
      loadBudgetTopicDefinitions(definitionsPath),
      reviewPath
    );
    const snapshot = buildMatchingSnapshot();
    const education = expectations.find(
      ({ definition }) => definition.topic.slug === "school-facility-aging"
    );
    const rejected = education?.review.rejectedRows[0];
    const source = snapshot.relations.find(
      (relation) => relation.topic_id === "topic-school-facility-aging"
    );
    if (!rejected || !source) {
      throw new Error("教育のfixtureを作れません");
    }
    snapshot.relations.push({
      ...source,
      budget_program_identity_id: rejected.budget_program_identity_id,
    });

    expect(() =>
      assertPublishedBudgetTopicsMatchReviews(expectations, snapshot)
    ).toThrow("公開件数が不一致");
  });

  it("reviewer情報が欠けた関係を拒否する", () => {
    const expectations = loadBudgetTopicPublishExpectations(
      loadBudgetTopicDefinitions(definitionsPath),
      reviewPath
    );
    const snapshot = buildMatchingSnapshot();
    const first = snapshot.relations[0];
    if (!first) {
      throw new Error("relation fixtureがありません");
    }
    first.reviewed_by = null;

    expect(() =>
      assertPublishedBudgetTopicsMatchReviews(expectations, snapshot)
    ).toThrow("公開内容がreview CSVと一致しません");
  });
});
