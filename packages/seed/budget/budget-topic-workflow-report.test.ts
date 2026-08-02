import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadBudgetTopicDefinitions } from "./budget-topic-definitions";
import {
  parseBudgetTopicReviewCsv,
  serializeBudgetTopicReviewRows,
} from "./budget-topic-review";
import {
  buildBudgetTopicWorkflowMetrics,
  type PublishedBudgetTopicSnapshot,
  renderBudgetTopicWorkflowReport,
} from "./budget-topic-workflow-report";
import { buildBudgetTopicCandidates } from "./generate-budget-topic-candidates";
import { writePublicBudgetTestFixture } from "./public-budget-test-fixture";
import { readPublicBudgetDataset } from "./read-public-budget-files";

const definitionsPath = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("budget topic workflow report", () => {
  it("公開関係と未分類identityを別々に集計する", () => {
    const inputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "budget-topic-report-")
    );
    temporaryDirectories.push(inputDirectory);
    writePublicBudgetTestFixture(inputDirectory);
    const dataset = readPublicBudgetDataset({ inputDirectory });
    const identity = dataset.programIdentities[0];
    const program = dataset.programs[0];
    if (!identity || !program) {
      throw new Error("fixture is missing budget rows");
    }
    identity.kan_name = "民生費";
    identity.kou_name = "児童福祉費";
    identity.moku_name = "保育所費";
    identity.display_program_name = "区立保育園運営";
    program.budget_program_name = "区立保育園運営";

    const definition = loadBudgetTopicDefinitions(definitionsPath).find(
      (candidate) => candidate.categorySlug === "child-rearing"
    );
    if (!definition) {
      throw new Error("child-rearing definition is missing");
    }
    const generated = buildBudgetTopicCandidates(dataset, [definition])[0];
    if (!generated) {
      throw new Error("candidate generation failed");
    }
    const reviewRows = generated.rows.map((row) => ({
      ...row,
      review_decision: "approve" as const,
      review_note: "レビュー済み",
    }));
    const reviews = new Map([
      [
        definition.topic.slug,
        parseBudgetTopicReviewCsv(serializeBudgetTopicReviewRows(reviewRows)),
      ],
    ]);
    const snapshot: PublishedBudgetTopicSnapshot = {
      sourceEnvironment: "local",
      activeDatasetId: "11111111-1111-4111-8111-111111111111",
      manifestSha256: dataset.manifestSha256,
      publishedTopicSlugs: [definition.topic.slug],
      relations: [
        {
          topicSlug: definition.topic.slug,
          categorySlugs: [definition.categorySlug],
          budgetProgramIdentityId: "bpi_test",
          evidenceLevel: "B_strong_structural",
        },
      ],
    };

    const metrics = buildBudgetTopicWorkflowMetrics(
      dataset,
      [definition],
      reviews,
      snapshot
    );
    expect(metrics).toMatchObject({
      totalIdentityCount: 1,
      publishedIdentityCount: 1,
      unclassifiedIdentityCount: 0,
      reviewPendingCount: 0,
      publishedRelationCount: 1,
    });
    expect(renderBudgetTopicWorkflowReport(metrics, snapshot)).toContain(
      "未分類identityはエラーではない"
    );
  });

  it("active datasetと入力manifestが違う場合は集計しない", () => {
    const inputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "budget-topic-report-mismatch-")
    );
    temporaryDirectories.push(inputDirectory);
    writePublicBudgetTestFixture(inputDirectory);
    const dataset = readPublicBudgetDataset({ inputDirectory });

    expect(() =>
      buildBudgetTopicWorkflowMetrics(dataset, [], new Map(), {
        sourceEnvironment: "local",
        activeDatasetId: "11111111-1111-4111-8111-111111111111",
        manifestSha256: "different",
        publishedTopicSlugs: [],
        relations: [],
      })
    ).toThrow("manifest hashが一致しません");
  });
});
