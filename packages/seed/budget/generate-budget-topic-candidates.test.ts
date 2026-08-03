import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadBudgetTopicDefinitions } from "./budget-topic-definitions";
import {
  readBudgetTopicReviewFile,
  serializeBudgetTopicReviewRows,
} from "./budget-topic-review";
import {
  buildBudgetTopicCandidates,
  writeBudgetTopicCandidateFiles,
} from "./generate-budget-topic-candidates";
import { writePublicBudgetTestFixture } from "./public-budget-test-fixture";
import { readPublicBudgetDataset } from "./read-public-budget-files";

const definitionsPath = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);
const temporaryDirectories: string[] = [];

function createDatasetAndDefinition() {
  const inputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "budget-topic-candidates-")
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
  identity.department_display_name = "子ども・若者部 保育課";
  program.major_program_name = "区立保育園運営";
  program.budget_program_name = "区立保育園運営";
  program.detail_program_name = "区立保育園運営";
  const definition = loadBudgetTopicDefinitions(definitionsPath).find(
    (candidate) => candidate.topic.slug === "childcare-services-and-environment"
  );
  if (!definition) {
    throw new Error("child-rearing definition is missing");
  }
  return { dataset, definition };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("budget topic candidate generation", () => {
  it("公式項目のルールからB候補を決定的に作る", () => {
    const { dataset, definition } = createDatasetAndDefinition();
    const [generated] = buildBudgetTopicCandidates(dataset, [definition]);

    expect(generated?.rows).toHaveLength(1);
    expect(generated?.rows[0]).toMatchObject({
      budget_program_identity_id: "bpi_test",
      candidate_topic: "保育サービス",
      evidence_level: "B_strong_structural",
      confidence: "high",
      review_decision: "",
      review_note: "",
    });
    expect(generated?.rows[0]?.evidence_fields).toMatchObject({
      matched_rule_id: "childcare-official-fields",
      budget_item_key: "2026_general_expenditure_01_01_01",
    });
  });

  it("人間の判断が入ったreview CSVを再生成で上書きしない", () => {
    const { dataset, definition } = createDatasetAndDefinition();
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "budget-topic-review-")
    );
    temporaryDirectories.push(outputDirectory);
    const [initial] = writeBudgetTopicCandidateFiles(
      dataset,
      [definition],
      outputDirectory
    );
    expect(initial?.status).toBe("generated");

    const reviewPath = path.join(outputDirectory, definition.topic.reviewFile);
    const review = readBudgetTopicReviewFile(reviewPath);
    const reviewedRows = review.rows.map((row) => ({
      ...row,
      review_decision: "approve" as const,
      review_note: "人間レビュー済み",
    }));
    const reviewedSource = serializeBudgetTopicReviewRows(reviewedRows);
    fs.writeFileSync(reviewPath, reviewedSource, "utf8");

    const [rerun] = writeBudgetTopicCandidateFiles(
      dataset,
      [definition],
      outputDirectory
    );
    expect(rerun?.status).toBe("preserved_reviewed");
    expect(fs.readFileSync(reviewPath, "utf8")).toBe(reviewedSource);
  });

  it("レビュー後に公式項目が変わっていれば保護せず停止する", () => {
    const { dataset, definition } = createDatasetAndDefinition();
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "budget-topic-review-changed-")
    );
    temporaryDirectories.push(outputDirectory);
    writeBudgetTopicCandidateFiles(dataset, [definition], outputDirectory);
    const reviewPath = path.join(outputDirectory, definition.topic.reviewFile);
    const review = readBudgetTopicReviewFile(reviewPath);
    fs.writeFileSync(
      reviewPath,
      serializeBudgetTopicReviewRows(
        review.rows.map((row) => ({
          ...row,
          review_decision: "approve" as const,
          review_note: "人間レビュー済み",
        }))
      ),
      "utf8"
    );
    const identity = dataset.programIdentities[0];
    if (!identity) {
      throw new Error("fixture identity is missing");
    }
    identity.amount_thousand_yen += 1;

    expect(() =>
      writeBudgetTopicCandidateFiles(dataset, [definition], outputDirectory)
    ).toThrow("公式項目が変更されています");
  });

  it("レビュー後に候補が増えていれば古いレビュー集合を保持せず停止する", () => {
    const { dataset, definition } = createDatasetAndDefinition();
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "budget-topic-review-added-")
    );
    temporaryDirectories.push(outputDirectory);
    writeBudgetTopicCandidateFiles(dataset, [definition], outputDirectory);
    const reviewPath = path.join(outputDirectory, definition.topic.reviewFile);
    const review = readBudgetTopicReviewFile(reviewPath);
    fs.writeFileSync(
      reviewPath,
      serializeBudgetTopicReviewRows(
        review.rows.map((row) => ({
          ...row,
          review_decision: "approve" as const,
          review_note: "人間レビュー済み",
        }))
      ),
      "utf8"
    );

    const identity = dataset.programIdentities[0];
    const program = dataset.programs[0];
    if (!identity || !program) {
      throw new Error("fixture budget rows are missing");
    }
    dataset.programIdentities.push({
      ...identity,
      budget_program_identity_id: "bpi_test_added",
      display_program_name: "私立保育園運営",
    });
    dataset.programs.push({
      ...program,
      program_id: "program_test_added",
      budget_program_identity_id: "bpi_test_added",
      budget_program_name: "私立保育園運営",
    });

    expect(() =>
      writeBudgetTopicCandidateFiles(dataset, [definition], outputDirectory)
    ).toThrow("候補集合が変更されています");
  });

  it("同じ入力では候補順とCSV内容が変わらない", () => {
    const { dataset, definition } = createDatasetAndDefinition();
    const first = buildBudgetTopicCandidates(dataset, [definition]);
    const second = buildBudgetTopicCandidates(dataset, [definition]);

    expect(first).toEqual(second);
  });
});
