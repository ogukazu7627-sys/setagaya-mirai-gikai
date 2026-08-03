import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readBudgetTopicReviewFile,
  serializeBudgetTopicReviewRows,
} from "./budget-topic-review";
import {
  autoApproveStrongHighBudgetTopicCandidates,
  type BudgetTopicReviewSiteOptions,
} from "./budget-topic-review-site";

const definitionsDirectory = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);
const sourceReviewDirectory = fileURLToPath(
  new URL("../../../data/budget/editorial/review", import.meta.url)
);
const reviewedEducationFile = "education-school-aging-candidates.csv";

export function createBudgetTopicReviewSiteTestFixture(options?: {
  autoApprove?: boolean;
}): {
  options: BudgetTopicReviewSiteOptions;
  remove: () => void;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "budget-topic-review-"));
  const copiedDefinitionsDirectory = path.join(root, "topic-definitions");
  const reviewDirectory = path.join(root, "review");
  fs.cpSync(definitionsDirectory, copiedDefinitionsDirectory, {
    recursive: true,
  });
  fs.cpSync(sourceReviewDirectory, reviewDirectory, { recursive: true });

  for (const fileName of fs.readdirSync(reviewDirectory).sort()) {
    if (
      !fileName.endsWith("-candidates.csv") ||
      fileName === reviewedEducationFile
    ) {
      continue;
    }
    const filePath = path.join(reviewDirectory, fileName);
    const review = readBudgetTopicReviewFile(filePath);
    fs.writeFileSync(
      filePath,
      serializeBudgetTopicReviewRows(
        review.rows.map((row) => ({
          ...row,
          review_decision: "",
          review_note: "",
        }))
      ),
      "utf8"
    );
  }

  const siteOptions = {
    definitionsDirectory: copiedDefinitionsDirectory,
    reviewDirectory,
  };
  if (options?.autoApprove !== false) {
    autoApproveStrongHighBudgetTopicCandidates(siteOptions);
  }

  return {
    options: siteOptions,
    remove: () => fs.rmSync(root, { force: true, recursive: true }),
  };
}
