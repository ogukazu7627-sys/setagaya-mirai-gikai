import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  budgetAdministrativeCoverageTopicSlugs,
  budgetTopicCategoryCatalog,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";

const definitionsPath = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);

describe("budget topic definitions", () => {
  it("10大分類に個別課題と全件到達用の行政機能topicを定義する", () => {
    const definitions = loadBudgetTopicDefinitions(definitionsPath);

    expect(definitions).toHaveLength(20);
    expect(
      new Set(definitions.map((definition) => definition.categorySlug))
    ).toEqual(
      new Set(budgetTopicCategoryCatalog.map((category) => category.slug))
    );
    expect(
      new Set(definitions.map((definition) => definition.topic.slug)).size
    ).toBe(definitions.length);
    for (const category of budgetTopicCategoryCatalog) {
      expect(
        definitions.filter(
          (definition) => definition.categorySlug === category.slug
        )
      ).toHaveLength(2);
    }
    expect(
      definitions.filter((definition) =>
        budgetAdministrativeCoverageTopicSlugs.includes(
          definition.topic
            .slug as (typeof budgetAdministrativeCoverageTopicSlugs)[number]
        )
      )
    ).toHaveLength(10);
    expect(
      definitions.every((definition) =>
        definition.topic.rules.every(
          (rule) =>
            rule.evidenceLevel === "B_strong_structural" ||
            rule.evidenceLevel === "C_editorial"
        )
      )
    ).toBe(true);
  });
});
