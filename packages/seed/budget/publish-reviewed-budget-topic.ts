import fs from "node:fs";
import { createAdminClient, type Json } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { assertSafeBudgetImportTarget } from "./import-public-budget";

export const educationSchoolAgingTopic = {
  fiscalYear: 2026,
  budgetType: "initial_budget",
  categorySlug: "education",
  topic: {
    slug: "school-facility-aging",
    name: "学校施設の老朽化への対応",
    shortDescription:
      "区立小・中学校の改築、施設改修、維持管理など、学校施設の老朽化への対応に関連する予算を探すための課題。",
    topicKind: "problem" as const,
    editorialNote:
      "みらい議会の編集データ。公開予算7ファイルに基づく人間レビュー済み関係であり、世田谷区の公式分類ではない。",
  },
} as const;

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

const publishResultSchema = z.strictObject({
  datasetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  topicId: z.string().uuid(),
  publishedRelationCount: z.number().int().nonnegative(),
  removedRelationCount: z.number().int().nonnegative(),
  status: z.literal("published"),
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
  rows: BudgetTopicReviewCandidate[];
  selectedRows: BudgetTopicReviewCandidate[];
  excludedRows: BudgetTopicReviewCandidate[];
  decisionCounts: Record<ReviewDecision, number>;
}

export interface ReviewedBudgetTopicPayload {
  fiscalYear: number;
  budgetType: string;
  categorySlug: string;
  topic: {
    slug: string;
    name: string;
    shortDescription: string;
    topicKind: "problem" | "goal" | "administrative_function";
    editorialNote: string;
  };
  reviewer: {
    id: string;
    reviewedAt: string;
  };
  relations: Array<{
    budgetProgramIdentityId: string;
    relationType: ReviewedRelationType;
    explanation: string;
    evidenceLevel: ReviewedEvidenceLevel;
    evidenceFields: Record<string, Json | undefined>;
    reviewDecision: "approve" | "revise";
  }>;
  excludedBudgetProgramIdentityIds: string[];
}

export type PublishReviewedBudgetTopicResult = z.infer<
  typeof publishResultSchema
>;

type AdminClient = SupabaseClient;

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

export function readBudgetTopicReviewFile(
  inputFile: string
): BudgetTopicReviewFile {
  const source = fs.readFileSync(inputFile, "utf8");
  const records = parse(source, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: false,
  }) as unknown[];

  const rows = records.map((record, index) => {
    const row = reviewCandidateRowSchema.parse(record);
    if (row.candidate_topic !== educationSchoolAgingTopic.topic.name) {
      throw new Error(
        `CSV ${index + 2}行目のcandidate_topicが対象外です: ${row.candidate_topic}`
      );
    }
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

  const selectedRows = rows.filter(
    (
      row
    ): row is BudgetTopicReviewCandidate & {
      review_decision: "approve" | "revise";
    } => row.review_decision === "approve" || row.review_decision === "revise"
  );
  const excludedRows = rows.filter(
    (row) => row.review_decision === "reject" || row.review_decision === ""
  );
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
    rows,
    selectedRows,
    excludedRows,
    decisionCounts,
  };
}

export function buildReviewedBudgetTopicPayload(
  reviewFile: BudgetTopicReviewFile,
  reviewer: { id: string; reviewedAt: string }
): ReviewedBudgetTopicPayload {
  if (reviewFile.selectedRows.length === 0) {
    throw new Error("approveまたはreviseされた候補がありません");
  }

  return {
    ...educationSchoolAgingTopic,
    reviewer,
    relations: reviewFile.selectedRows.map((row) => ({
      budgetProgramIdentityId: row.budget_program_identity_id,
      relationType: row.proposed_relation_type,
      explanation: row.proposed_explanation,
      evidenceLevel: row.evidence_level,
      evidenceFields: row.evidence_fields,
      reviewDecision: row.review_decision as "approve" | "revise",
    })),
    excludedBudgetProgramIdentityIds: reviewFile.excludedRows.map(
      (row) => row.budget_program_identity_id
    ),
  };
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です`);
  }
  return value;
}

export async function publishReviewedBudgetTopic(
  payload: ReviewedBudgetTopicPayload,
  client?: AdminClient
): Promise<PublishReviewedBudgetTopicResult> {
  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  requireEnvironment("SUPABASE_SECRET_KEY");
  assertSafeBudgetImportTarget({
    supabaseUrl,
    environmentName: process.env.BUDGET_IMPORT_ENVIRONMENT,
  });

  const adminClient = client ?? (createAdminClient() as AdminClient);
  const { data, error } = await adminClient.rpc(
    "publish_reviewed_budget_topic",
    {
      p_payload: payload as unknown as Json,
    }
  );
  if (error) {
    throw new Error(`課題・事業関係の登録に失敗しました: ${error.message}`);
  }
  return publishResultSchema.parse(data);
}
