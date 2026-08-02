import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readBudgetTopicReviewFile } from "./budget-topic-review";
import {
  autoApproveStrongHighBudgetTopicCandidates,
  automaticBudgetTopicApprovalNote,
  BudgetTopicReviewConflictError,
  BudgetTopicReviewInputError,
  type BudgetTopicReviewSiteOptions,
  readBudgetTopicReviewSiteSnapshot,
  saveBudgetTopicReviewSiteChanges,
} from "./budget-topic-review-site";
import { createBudgetTopicReviewSiteTestFixture } from "./budget-topic-review-site-test-fixture";

const fixtureCleanup: Array<() => void> = [];

function createOptions(): BudgetTopicReviewSiteOptions {
  const fixture = createBudgetTopicReviewSiteTestFixture();
  fixtureCleanup.push(fixture.remove);
  return fixture.options;
}

afterEach(() => {
  for (const remove of fixtureCleanup.splice(0)) {
    remove();
  }
});

describe("budget topic review site data", () => {
  it("全件到達用topicを含め、B・High以外の29件だけを手動確認対象にする", () => {
    const snapshot = readBudgetTopicReviewSiteSnapshot(createOptions());

    expect(snapshot.summary).toEqual({
      total: 1_331,
      pending: 23,
      approve: 1_305,
      revise: 0,
      reject: 3,
      categoryCount: 10,
      topicCount: 20,
      automaticApprovalRuleMatches: 1_302,
      automaticallyApproved: 1_302,
      manualReviewTotal: 29,
      manualPending: 23,
      manualApprove: 3,
      manualRevise: 0,
      manualReject: 3,
    });
    expect(snapshot.rows).toHaveLength(1_331);
    expect(new Set(snapshot.rows.map((row) => row.rowKey)).size).toBe(1_331);
    expect(
      snapshot.rows.filter((row) => row.requiresManualReview)
    ).toHaveLength(29);
  });

  it("B・Highの未判断だけを決定的に一括承認する", () => {
    const fixture = createBudgetTopicReviewSiteTestFixture({
      autoApprove: false,
    });
    fixtureCleanup.push(fixture.remove);
    const before = readBudgetTopicReviewSiteSnapshot(fixture.options);
    const targetBefore = before.rows.find(
      (row) => row.automaticApprovalRuleMatches && row.reviewDecision === ""
    );
    expect(targetBefore).toBeDefined();

    expect(autoApproveStrongHighBudgetTopicCandidates(fixture.options)).toEqual(
      {
        matched: 1_302,
        updated: 1_292,
        alreadyApproved: 10,
        updatedFiles: 19,
      }
    );
    const after = readBudgetTopicReviewSiteSnapshot(fixture.options);
    expect(after.summary).toMatchObject({
      pending: 23,
      approve: 1_305,
      automaticallyApproved: 1_302,
      manualReviewTotal: 29,
    });
    const targetAfter = after.rows.find(
      (row) => row.rowKey === targetBefore?.rowKey
    );
    expect(targetAfter).toMatchObject({
      reviewDecision: "approve",
      reviewNote: automaticBudgetTopicApprovalNote,
      requiresManualReview: false,
    });
    expect(autoApproveStrongHighBudgetTopicCandidates(fixture.options)).toEqual(
      {
        matched: 1_302,
        updated: 0,
        alreadyApproved: 1_302,
        updatedFiles: 0,
      }
    );
  });

  it("判断だけを保存し、公式候補値と他の行を維持する", () => {
    const options = createOptions();
    const before = readBudgetTopicReviewSiteSnapshot(options);
    const target = before.rows.find((row) => row.reviewDecision === "");
    expect(target).toBeDefined();
    if (!target) {
      return;
    }
    const inputFile = path.join(options.reviewDirectory, target.reviewFile);
    const beforeFile = readBudgetTopicReviewFile(inputFile);

    const after = saveBudgetTopicReviewSiteChanges(options, {
      revision: before.revision,
      changes: [
        {
          reviewFile: target.reviewFile,
          budgetProgramIdentityId: target.budgetProgramIdentityId,
          reviewDecision: "approve",
          reviewNote: "ローカル画面で確認済み",
          proposedRelationType: target.proposedRelationType,
          proposedExplanation: target.proposedExplanation,
        },
      ],
    });

    expect(after.summary.pending).toBe(22);
    expect(after.summary.approve).toBe(1_306);
    const afterFile = readBudgetTopicReviewFile(inputFile);
    expect(afterFile.rows).toHaveLength(beforeFile.rows.length);
    for (const beforeRow of beforeFile.rows) {
      const afterRow = afterFile.rows.find(
        (row) =>
          row.budget_program_identity_id ===
          beforeRow.budget_program_identity_id
      );
      expect(afterRow).toBeDefined();
      if (!afterRow) {
        continue;
      }
      if (
        beforeRow.budget_program_identity_id === target.budgetProgramIdentityId
      ) {
        expect(afterRow).toEqual({
          ...beforeRow,
          review_decision: "approve",
          review_note: "ローカル画面で確認済み",
        });
      } else {
        expect(afterRow).toEqual(beforeRow);
      }
    }
  });

  it("古いrevisionからの保存を拒否する", () => {
    const options = createOptions();
    const before = readBudgetTopicReviewSiteSnapshot(options);
    const targets = before.rows.filter((row) => row.reviewDecision === "");
    const first = targets[0];
    const second = targets[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!(first && second)) {
      return;
    }

    saveBudgetTopicReviewSiteChanges(options, {
      revision: before.revision,
      changes: [
        {
          reviewFile: first.reviewFile,
          budgetProgramIdentityId: first.budgetProgramIdentityId,
          reviewDecision: "reject",
          reviewNote: "対象外",
          proposedRelationType: first.proposedRelationType,
          proposedExplanation: first.proposedExplanation,
        },
      ],
    });

    expect(() =>
      saveBudgetTopicReviewSiteChanges(options, {
        revision: before.revision,
        changes: [
          {
            reviewFile: second.reviewFile,
            budgetProgramIdentityId: second.budgetProgramIdentityId,
            reviewDecision: "approve",
            reviewNote: "承認",
            proposedRelationType: second.proposedRelationType,
            proposedExplanation: second.proposedExplanation,
          },
        ],
      })
    ).toThrow(BudgetTopicReviewConflictError);
  });

  it("内容を変えていないreviseと定義外ファイルを拒否する", () => {
    const options = createOptions();
    const snapshot = readBudgetTopicReviewSiteSnapshot(options);
    const target = snapshot.rows.find((row) => row.reviewDecision === "");
    expect(target).toBeDefined();
    if (!target) {
      return;
    }

    expect(() =>
      saveBudgetTopicReviewSiteChanges(options, {
        revision: snapshot.revision,
        changes: [
          {
            reviewFile: target.reviewFile,
            budgetProgramIdentityId: target.budgetProgramIdentityId,
            reviewDecision: "revise",
            reviewNote: "修正",
            proposedRelationType: target.proposedRelationType,
            proposedExplanation: target.proposedExplanation,
          },
        ],
      })
    ).toThrow(BudgetTopicReviewInputError);

    expect(() =>
      saveBudgetTopicReviewSiteChanges(options, {
        revision: snapshot.revision,
        changes: [
          {
            reviewFile: "unknown-topic-candidates.csv",
            budgetProgramIdentityId: target.budgetProgramIdentityId,
            reviewDecision: "reject",
            reviewNote: "対象外",
            proposedRelationType: target.proposedRelationType,
            proposedExplanation: target.proposedExplanation,
          },
        ],
      })
    ).toThrow(BudgetTopicReviewInputError);
  });
});
