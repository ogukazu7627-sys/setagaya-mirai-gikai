import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import descriptionCatalog from "../../../web/src/features/budget/shared/utils/budget-program-general-description-catalog.json";
import { readBudgetTopicReviewFile } from "./budget-topic-review";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const reviewDirectory = path.join(
  repositoryRoot,
  "data/budget/editorial/review"
);

function approvedProgramNames(): string[] {
  return fs
    .readdirSync(reviewDirectory)
    .filter((fileName) => fileName.endsWith(".csv"))
    .sort()
    .flatMap((fileName) =>
      readBudgetTopicReviewFile(
        path.join(reviewDirectory, fileName)
      ).selectedRows.map((row) => row.display_program_name)
    );
}

describe("budget program general description catalog", () => {
  it("公開中の全582事業に過不足なく個別説明を持つ", () => {
    const approvedNames = approvedProgramNames();
    const catalogNames = Object.keys(descriptionCatalog);

    expect(approvedNames).toHaveLength(582);
    expect(new Set(approvedNames).size).toBe(582);
    expect(catalogNames).toHaveLength(582);
    expect([...catalogNames].sort()).toEqual([...approvedNames].sort());
  });

  it("曖昧な共通文を個別説明へ持ち込まない", () => {
    const prohibitedExpressions = [
      "事業名に示された",
      "行政上の取組",
      "行政サービスや取組",
      "取組を継続して運営",
    ];

    for (const [programName, purpose] of Object.entries(descriptionCatalog)) {
      expect(purpose.length, programName).toBeGreaterThanOrEqual(20);
      for (const expression of prohibitedExpressions) {
        expect(purpose, programName).not.toContain(expression);
      }
    }
  });
});
