import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  budgetTopicCategoryCatalog,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";

const definitionsPath = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);

describe("budget topic definitions", () => {
  it("10大分類をそれぞれ1回だけ定義する", () => {
    const definitions = loadBudgetTopicDefinitions(definitionsPath);

    expect(definitions).toHaveLength(10);
    expect(
      new Set(definitions.map((definition) => definition.categorySlug))
    ).toEqual(
      new Set(budgetTopicCategoryCatalog.map((category) => category.slug))
    );
    expect(
      new Set(definitions.map((definition) => definition.topic.slug)).size
    ).toBe(definitions.length);
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
