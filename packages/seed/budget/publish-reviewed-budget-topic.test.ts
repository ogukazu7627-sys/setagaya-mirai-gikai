import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findBudgetTopicDefinitionForReviewFile,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";
import {
  parseBudgetTopicReviewCsv,
  serializeBudgetTopicReviewRows,
} from "./budget-topic-review";
import {
  buildReviewedBudgetTopicPayload,
  readBudgetTopicReviewFile,
} from "./publish-reviewed-budget-topic";

const reviewedCandidatesPath = fileURLToPath(
  new URL(
    "../../../data/budget/editorial/review/education-school-aging-candidates.csv",
    import.meta.url
  )
);
const definitionsPath = fileURLToPath(
  new URL("../../../data/budget/editorial/topic-definitions", import.meta.url)
);

function getEducationDefinition() {
  const reviewFile = readBudgetTopicReviewFile(reviewedCandidatesPath);
  return findBudgetTopicDefinitionForReviewFile(
    loadBudgetTopicDefinitions(definitionsPath),
    reviewedCandidatesPath,
    reviewFile.candidateTopicName
  );
}

describe("reviewed budget topic candidates", () => {
  it("直接性の高い10件だけを公開対象にする", () => {
    const reviewFile = readBudgetTopicReviewFile(reviewedCandidatesPath);

    expect(reviewFile.rows).toHaveLength(16);
    expect(reviewFile.selectedRows).toHaveLength(10);
    expect(reviewFile.rejectedRows).toHaveLength(6);
    expect(reviewFile.pendingRows).toHaveLength(0);
    expect(reviewFile.decisionCounts).toEqual({
      approve: 10,
      revise: 0,
      reject: 6,
      "": 0,
    });
    expect(
      reviewFile.selectedRows.reduce(
        (total, row) => total + Number(row.amount_thousand_yen),
        0
      )
    ).toBe(13_083_893);
    expect(
      reviewFile.rejectedRows.reduce(
        (total, row) => total + Number(row.amount_thousand_yen),
        0
      )
    ).toBe(5_829_786);
  });

  it("承認・修正行だけをpublished payloadへ入れる", () => {
    const reviewFile = readBudgetTopicReviewFile(reviewedCandidatesPath);
    const definition = getEducationDefinition();
    const payload = buildReviewedBudgetTopicPayload(reviewFile, definition, {
      id: "11111111-1111-4111-8111-111111111111",
      reviewedAt: "2026-07-30T16:33:02+09:00",
    });

    expect(payload.topic).toEqual({
      slug: definition.topic.slug,
      name: definition.topic.name,
      shortDescription: definition.topic.shortDescription,
      topicKind: definition.topic.topicKind,
      editorialNote: definition.topic.editorialNote,
    });
    expect(payload.categorySlug).toBe("education");
    expect(payload.relations).toHaveLength(10);
    expect(
      payload.relations.every(
        (relation) =>
          relation.reviewDecision === "approve" ||
          relation.reviewDecision === "revise"
      )
    ).toBe(true);
    expect(payload.excludedBudgetProgramIdentityIds).toEqual(
      reviewFile.rejectedRows.map((row) => row.budget_program_identity_id)
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

  it("review_decisionが空欄の候補を公開payloadへ入れない", () => {
    const reviewed = readBudgetTopicReviewFile(reviewedCandidatesPath);
    const source = serializeBudgetTopicReviewRows(
      reviewed.rows.map((row, index) =>
        index === 0 ? { ...row, review_decision: "", review_note: "" } : row
      )
    );
    const reviewFile = parseBudgetTopicReviewCsv(source);

    expect(() =>
      buildReviewedBudgetTopicPayload(reviewFile, getEducationDefinition(), {
        id: "11111111-1111-4111-8111-111111111111",
        reviewedAt: "2026-07-30T16:33:02+09:00",
      })
    ).toThrow("review_decisionが空欄");
  });
});
