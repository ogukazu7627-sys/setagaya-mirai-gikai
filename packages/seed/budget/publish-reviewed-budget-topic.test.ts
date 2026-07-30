import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildReviewedBudgetTopicPayload,
  educationSchoolAgingTopic,
  readBudgetTopicReviewFile,
} from "./publish-reviewed-budget-topic";

const reviewedCandidatesPath = fileURLToPath(
  new URL(
    "../../../data/budget/editorial/review/education-school-aging-candidates.csv",
    import.meta.url
  )
);

describe("reviewed budget topic candidates", () => {
  it("人間レビュー結果を13件の公開対象と3件の除外対象に分ける", () => {
    const reviewFile = readBudgetTopicReviewFile(reviewedCandidatesPath);

    expect(reviewFile.rows).toHaveLength(16);
    expect(reviewFile.selectedRows).toHaveLength(13);
    expect(reviewFile.excludedRows).toHaveLength(3);
    expect(reviewFile.decisionCounts).toEqual({
      approve: 13,
      revise: 0,
      reject: 3,
      "": 0,
    });
    expect(
      reviewFile.selectedRows.reduce(
        (total, row) => total + Number(row.amount_thousand_yen),
        0
      )
    ).toBe(17_872_606);
    expect(
      reviewFile.excludedRows.reduce(
        (total, row) => total + Number(row.amount_thousand_yen),
        0
      )
    ).toBe(1_041_073);
  });

  it("承認・修正行だけをpublished payloadへ入れる", () => {
    const reviewFile = readBudgetTopicReviewFile(reviewedCandidatesPath);
    const payload = buildReviewedBudgetTopicPayload(reviewFile, {
      id: "11111111-1111-4111-8111-111111111111",
      reviewedAt: "2026-07-30T16:33:02+09:00",
    });

    expect(payload.topic).toEqual(educationSchoolAgingTopic.topic);
    expect(payload.categorySlug).toBe("education");
    expect(payload.relations).toHaveLength(13);
    expect(
      payload.relations.every(
        (relation) =>
          relation.reviewDecision === "approve" ||
          relation.reviewDecision === "revise"
      )
    ).toBe(true);
    expect(payload.excludedBudgetProgramIdentityIds).toEqual(
      reviewFile.excludedRows.map((row) => row.budget_program_identity_id)
    );
    expect(payload.relations[0]?.explanation).toBe(
      reviewFile.selectedRows[0]?.proposed_explanation
    );
    expect(payload.relations[0]?.evidenceFields).toEqual(
      reviewFile.selectedRows[0]?.evidence_fields
    );
  });

  it("A_official_directを使用しない", () => {
    const reviewFile = readBudgetTopicReviewFile(reviewedCandidatesPath);

    expect(
      reviewFile.rows.every(
        (row) =>
          row.evidence_level === "B_strong_structural" ||
          row.evidence_level === "C_editorial"
      )
    ).toBe(true);
  });
});
