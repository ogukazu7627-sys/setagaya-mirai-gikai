import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBudgetTopicDefinitions } from "./budget-topic-definitions";
import {
  budgetTopicPublicationLimits,
  budgetTopicShortNames,
} from "./budget-topic-publication-policy";
import { readBudgetTopicReviewFile } from "./budget-topic-review";
import { curateBudgetTopicPublicationFiles } from "./curate-budget-topic-publication";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const definitionsDirectory = path.join(
  repositoryRoot,
  "data/budget/editorial/topic-definitions"
);
const reviewDirectory = path.join(
  repositoryRoot,
  "data/budget/editorial/review"
);

function directoryDigest(directory: string): string {
  const hash = crypto.createHash("sha256");
  for (const fileName of fs.readdirSync(directory).sort()) {
    hash.update(fileName);
    hash.update(fs.readFileSync(path.join(directory, fileName)));
  }
  return hash.digest("hex");
}

describe("budget topic publication policy", () => {
  it("短いtopic名と公開件数上限を全review CSVで満たす", () => {
    const definitions = loadBudgetTopicDefinitions(definitionsDirectory);
    const published = definitions.filter(
      (definition) => definition.topic.publicationStatus === "published"
    );
    const archived = definitions.filter(
      (definition) => definition.topic.publicationStatus === "archived"
    );

    expect(definitions).toHaveLength(76);
    expect(published).toHaveLength(64);
    expect(archived).toHaveLength(12);
    expect(Object.keys(budgetTopicShortNames)).toHaveLength(76);
    expect(
      new Set(definitions.map((definition) => definition.topic.name)).size
    ).toBe(76);

    const topicCountByCategory = new Map<string, number>();
    const selectedIdentityIds: string[] = [];
    let selectedRelationCount = 0;
    let manualRejectCount = 0;

    for (const definition of definitions) {
      expect(definition.topic.name.length).toBeLessThanOrEqual(
        budgetTopicPublicationLimits.maxTopicNameLength
      );
      const review = readBudgetTopicReviewFile(
        path.join(reviewDirectory, definition.topic.reviewFile)
      );
      expect(review.candidateTopicName).toBe(definition.topic.name);
      expect(review.pendingRows).toHaveLength(0);

      if (definition.topic.publicationStatus === "archived") {
        expect(review.selectedRows).toHaveLength(0);
      } else {
        expect(review.selectedRows.length).toBeGreaterThan(0);
        expect(review.selectedRows.length).toBeLessThanOrEqual(
          budgetTopicPublicationLimits.maxProgramsPerTopic
        );
        topicCountByCategory.set(
          definition.categorySlug,
          (topicCountByCategory.get(definition.categorySlug) ?? 0) + 1
        );
        for (const row of review.selectedRows) {
          expect(row.evidence_level).toBe("B_strong_structural");
          expect(row.confidence).toBe("high");
          expect(Number(row.amount_thousand_yen)).toBeGreaterThan(0);
          selectedIdentityIds.push(row.budget_program_identity_id);
        }
        selectedRelationCount += review.selectedRows.length;
      }
      manualRejectCount += review.rejectedRows.filter(
        (row) => !row.review_note.startsWith("[publication-policy]")
      ).length;
    }

    for (const topicCount of topicCountByCategory.values()) {
      expect(topicCount).toBeLessThanOrEqual(
        budgetTopicPublicationLimits.maxTopicsPerCategory
      );
    }
    expect(selectedRelationCount).toBe(582);
    expect(new Set(selectedIdentityIds).size).toBe(582);
    expect(manualRejectCount).toBe(8);
  });

  it("同じ入力へ再適用しても同一ハッシュになる", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "budget-topic-policy-"));
    const copiedDefinitions = path.join(root, "definitions");
    const copiedReviews = path.join(root, "review");
    fs.cpSync(definitionsDirectory, copiedDefinitions, { recursive: true });
    fs.cpSync(reviewDirectory, copiedReviews, { recursive: true });

    curateBudgetTopicPublicationFiles(copiedDefinitions, copiedReviews);
    const first = `${directoryDigest(copiedDefinitions)}:${directoryDigest(
      copiedReviews
    )}`;
    curateBudgetTopicPublicationFiles(copiedDefinitions, copiedReviews);
    const second = `${directoryDigest(copiedDefinitions)}:${directoryDigest(
      copiedReviews
    )}`;

    expect(second).toBe(first);
  });
});
