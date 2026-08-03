import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildBudgetConcreteTopicExpansionDefinitionFiles } from "./budget-concrete-topic-expansion-catalog";
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

describe("budget concrete topic expansion", () => {
  it("生成済み定義ファイルが決定的なcatalogと一致する", () => {
    for (const {
      fileName,
      definition,
    } of buildBudgetConcreteTopicExpansionDefinitionFiles()) {
      expect(
        JSON.parse(
          fs.readFileSync(path.join(definitionsDirectory, fileName), "utf8")
        )
      ).toEqual(definition);
    }
  });

  it("初期10 topicの候補外981 identityを重複・欠落なく具体化する", () => {
    const definitions = loadBudgetTopicDefinitions(definitionsDirectory);
    const expansionDefinitions = definitions.filter(
      (definition) => definition.topic.sourceAdministrativeTopicSlug
    );
    const expansionRows = expansionDefinitions.flatMap((definition) =>
      readBudgetTopicReviewFile(
        path.join(reviewDirectory, definition.topic.reviewFile)
      ).rows.map((row) => ({ definition, row }))
    );
    const initialIds = new Set(
      definitions
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
    const administrativeIds = new Set(
      definitions
        .filter((definition) =>
          budgetAdministrativeCoverageTopicSlugs.includes(
            definition.topic
              .slug as (typeof budgetAdministrativeCoverageTopicSlugs)[number]
          )
        )
        .flatMap((definition) =>
          readBudgetTopicReviewFile(
            path.join(reviewDirectory, definition.topic.reviewFile)
          ).rows.map((row) => row.budget_program_identity_id)
        )
    );
    const expansionIds = expansionRows.map(
      ({ row }) => row.budget_program_identity_id
    );

    expect(expansionDefinitions).toHaveLength(56);
    expect(expansionRows).toHaveLength(981);
    expect(new Set(expansionIds)).toHaveLength(981);
    expect(initialIds).toHaveLength(175);
    expect(administrativeIds).toHaveLength(1_156);
    expect(
      expansionIds.filter((identityId) => initialIds.has(identityId))
    ).toEqual([]);
    expect(
      expansionIds.filter((identityId) => !administrativeIds.has(identityId))
    ).toEqual([]);
    expect(
      Object.fromEntries(
        [
          "education",
          "child-rearing",
          "welfare",
          "urban-development",
          "disaster-prevention",
          "administration-finance",
          "culture-sports",
          "industry",
          "environment",
          "daily-life",
        ].map((categorySlug) => [
          categorySlug,
          expansionRows.filter(
            ({ definition }) => definition.categorySlug === categorySlug
          ).length,
        ])
      )
    ).toEqual({
      education: 108,
      "child-rearing": 71,
      welfare: 329,
      "urban-development": 142,
      "disaster-prevention": 0,
      "administration-finance": 107,
      "culture-sports": 69,
      industry: 17,
      environment: 43,
      "daily-life": 95,
    });
    expect(
      expansionRows.every(
        ({ row }) =>
          row.evidence_level === "B_strong_structural" &&
          row.confidence === "high"
      )
    ).toBe(true);
  });
});
