import fs from "node:fs";
import type { Json } from "@mirai-gikai/supabase";
import { parse } from "csv-parse/sync";
import { z } from "zod";

export const budgetTopicReviewHeaders = [
  "budget_program_identity_id",
  "display_program_name",
  "account_name",
  "kan_name",
  "kou_name",
  "moku_name",
  "department_display_name",
  "amount_thousand_yen",
  "candidate_topic",
  "proposed_relation_type",
  "proposed_explanation",
  "evidence_level",
  "evidence_fields",
  "confidence",
  "review_decision",
  "review_note",
] as const;

const reviewDecisionSchema = z.enum(["approve", "revise", "reject", ""]);
const relationTypeSchema = z.enum([
  "responds_to",
  "supports",
  "maintains",
  "enables",
]);
const evidenceLevelSchema = z.enum(["B_strong_structural", "C_editorial"]);

const reviewCandidateRowSchema = z.strictObject({
  budget_program_identity_id: z.string().min(1),
  display_program_name: z.string().min(1),
  account_name: z.string().min(1),
  kan_name: z.string().min(1),
  kou_name: z.string().min(1),
  moku_name: z.string().min(1),
  department_display_name: z.string(),
  amount_thousand_yen: z.string().regex(/^-?\d+$/),
  candidate_topic: z.string().min(1),
  proposed_relation_type: relationTypeSchema,
  proposed_explanation: z.string().min(1),
  evidence_level: evidenceLevelSchema,
  evidence_fields: z.string().min(2),
  confidence: z.enum(["high", "medium", "low"]),
  review_decision: reviewDecisionSchema,
  review_note: z.string(),
});

type RawReviewCandidateRow = z.infer<typeof reviewCandidateRowSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type ReviewedRelationType = z.infer<typeof relationTypeSchema>;
export type ReviewedEvidenceLevel = z.infer<typeof evidenceLevelSchema>;

export interface BudgetTopicReviewCandidate
  extends Omit<RawReviewCandidateRow, "evidence_fields"> {
  evidence_fields: Record<string, Json | undefined>;
}

export interface BudgetTopicReviewFile {
  candidateTopicName: string;
  rows: BudgetTopicReviewCandidate[];
  selectedRows: BudgetTopicReviewCandidate[];
  rejectedRows: BudgetTopicReviewCandidate[];
  pendingRows: BudgetTopicReviewCandidate[];
  decisionCounts: Record<ReviewDecision, number>;
}

function parseEvidenceFields(
  source: string,
  rowNumber: number
): Record<string, Json | undefined> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(
      `CSV ${rowNumber}行目のevidence_fieldsがJSONではありません`
    );
  }
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(
      `CSV ${rowNumber}行目のevidence_fieldsはJSON objectである必要があります`
    );
  }
  return parsed as Record<string, Json | undefined>;
}

function assertUniqueIdentities(rows: BudgetTopicReviewCandidate[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.budget_program_identity_id)) {
      throw new Error(
        `budget_program_identity_idが重複しています: ${row.budget_program_identity_id}`
      );
    }
    seen.add(row.budget_program_identity_id);
  }
}

export function parseBudgetTopicReviewCsv(
  source: string
): BudgetTopicReviewFile {
  const headerRows = parse(source, {
    bom: true,
    skip_empty_lines: true,
    to_line: 1,
  }) as string[][];
  const headers = headerRows[0] ?? [];
  if (
    headers.length !== budgetTopicReviewHeaders.length ||
    headers.some((header, index) => header !== budgetTopicReviewHeaders[index])
  ) {
    throw new Error("review CSVの列が期待スキーマと一致しません");
  }

  const records = parse(source, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: false,
  }) as unknown[];
  if (records.length === 0) {
    throw new Error("review CSVに候補行がありません");
  }

  const rows = records.map((record, index) => {
    const row = reviewCandidateRowSchema.parse(record);
    if (
      (row.review_decision === "approve" || row.review_decision === "revise") &&
      row.review_note.trim() === ""
    ) {
      throw new Error(
        `CSV ${index + 2}行目のレビュー済み候補にreview_noteがありません`
      );
    }
    return {
      ...row,
      evidence_fields: parseEvidenceFields(row.evidence_fields, index + 2),
    };
  });

  assertUniqueIdentities(rows);
  const candidateTopicNames = new Set(rows.map((row) => row.candidate_topic));
  if (candidateTopicNames.size !== 1) {
    throw new Error("1つのreview CSVに複数topicを混在させることはできません");
  }

  const selectedRows = rows.filter(
    (
      row
    ): row is BudgetTopicReviewCandidate & {
      review_decision: "approve" | "revise";
    } => row.review_decision === "approve" || row.review_decision === "revise"
  );
  const rejectedRows = rows.filter((row) => row.review_decision === "reject");
  const pendingRows = rows.filter((row) => row.review_decision === "");
  const decisionCounts: Record<ReviewDecision, number> = {
    approve: 0,
    revise: 0,
    reject: 0,
    "": 0,
  };
  for (const row of rows) {
    decisionCounts[row.review_decision] += 1;
  }

  return {
    candidateTopicName: rows[0]?.candidate_topic ?? "",
    rows,
    selectedRows,
    rejectedRows,
    pendingRows,
    decisionCounts,
  };
}

export function readBudgetTopicReviewFile(
  inputFile: string
): BudgetTopicReviewFile {
  return parseBudgetTopicReviewCsv(fs.readFileSync(inputFile, "utf8"));
}

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function serializeBudgetTopicReviewRows(
  rows: BudgetTopicReviewCandidate[]
): string {
  const lines = [budgetTopicReviewHeaders.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    const values = budgetTopicReviewHeaders.map((header) => {
      const value = row[header];
      return escapeCsvCell(
        header === "evidence_fields" ? JSON.stringify(value) : String(value)
      );
    });
    lines.push(values.join(","));
  }
  return `${lines.join("\n")}\n`;
}
