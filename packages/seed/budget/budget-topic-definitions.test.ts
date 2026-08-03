import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  budgetAdministrativeCoverageTopicSlugs,
  budgetInitialConcreteTopicSlugs,
  budgetTopicCategoryCatalog,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";

const definitionsPath = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);

describe("budget topic definitions", () => {
  it("10大分類に初期課題、行政機能、具体的課題候補を定義する", () => {
    const definitions = loadBudgetTopicDefinitions(definitionsPath);

    expect(definitions).toHaveLength(76);
    expect(
      new Set(definitions.map((definition) => definition.categorySlug))
    ).toEqual(
      new Set(budgetTopicCategoryCatalog.map((category) => category.slug))
    );
    expect(
      new Set(definitions.map((definition) => definition.topic.slug)).size
    ).toBe(definitions.length);
    expect(
      Object.fromEntries(
        budgetTopicCategoryCatalog.map((category) => [
          category.slug,
          definitions.filter(
            (definition) => definition.categorySlug === category.slug
          ).length,
        ])
      )
    ).toEqual({
      education: 8,
      "child-rearing": 7,
      welfare: 14,
      "urban-development": 10,
      "disaster-prevention": 2,
      "administration-finance": 8,
      "culture-sports": 8,
      industry: 5,
      environment: 6,
      "daily-life": 8,
    });
    expect(
      definitions.filter((definition) =>
        budgetAdministrativeCoverageTopicSlugs.includes(
          definition.topic
            .slug as (typeof budgetAdministrativeCoverageTopicSlugs)[number]
        )
      )
    ).toHaveLength(10);
    expect(
      definitions.filter((definition) =>
        budgetInitialConcreteTopicSlugs.includes(
          definition.topic
            .slug as (typeof budgetInitialConcreteTopicSlugs)[number]
        )
      )
    ).toHaveLength(10);
    expect(
      definitions.filter(
        (definition) => definition.topic.sourceAdministrativeTopicSlug
      )
    ).toHaveLength(56);
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
