import { createAdminClient, type Json } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ResolvedBudgetTopicDefinition } from "./budget-topic-definitions";
import type {
  BudgetTopicReviewFile,
  ReviewedEvidenceLevel,
  ReviewedRelationType,
} from "./budget-topic-review";
import { assertSafeBudgetTopicPublishTarget } from "./budget-topic-publish-target";

export {
  type BudgetTopicReviewCandidate,
  type BudgetTopicReviewFile,
  type ReviewDecision,
  type ReviewedEvidenceLevel,
  type ReviewedRelationType,
  readBudgetTopicReviewFile,
} from "./budget-topic-review";

const publishResultSchema = z.strictObject({
  datasetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  topicId: z.string().uuid(),
  publishedRelationCount: z.number().int().nonnegative(),
  removedRelationCount: z.number().int().nonnegative(),
  status: z.literal("published"),
});

const archiveResultSchema = z.strictObject({
  datasetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  topicId: z.string().uuid(),
  archivedRelationCount: z.number().int().nonnegative(),
  status: z.literal("archived"),
});

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

export interface ArchivedBudgetTopicPayload {
  fiscalYear: number;
  budgetType: string;
  categorySlug: string;
  topic: ReviewedBudgetTopicPayload["topic"];
}

export type PublishReviewedBudgetTopicResult = z.infer<
  typeof publishResultSchema
>;
export type ArchiveReviewedBudgetTopicResult = z.infer<
  typeof archiveResultSchema
>;

type AdminClient = SupabaseClient;

export function buildReviewedBudgetTopicPayload(
  reviewFile: BudgetTopicReviewFile,
  definition: ResolvedBudgetTopicDefinition,
  reviewer: { id: string; reviewedAt: string }
): ReviewedBudgetTopicPayload {
  if (definition.topic.publicationStatus !== "published") {
    throw new Error("archived topicをpublish payloadにはできません");
  }
  if (reviewFile.candidateTopicName !== definition.topic.name) {
    throw new Error(
      `review CSVのtopic名が定義と一致しません: ${reviewFile.candidateTopicName}`
    );
  }
  if (reviewFile.pendingRows.length > 0) {
    throw new Error(
      `review_decisionが空欄の候補が${reviewFile.pendingRows.length}件あります`
    );
  }
  if (reviewFile.selectedRows.length === 0) {
    throw new Error("approveまたはreviseされた候補がありません");
  }

  return {
    fiscalYear: definition.fiscalYear,
    budgetType: definition.budgetType,
    categorySlug: definition.categorySlug,
    topic: {
      slug: definition.topic.slug,
      name: definition.topic.name,
      shortDescription: definition.topic.shortDescription,
      topicKind: definition.topic.topicKind,
      editorialNote: definition.topic.editorialNote,
    },
    reviewer,
    relations: reviewFile.selectedRows.map((row) => ({
      budgetProgramIdentityId: row.budget_program_identity_id,
      relationType: row.proposed_relation_type,
      explanation: row.proposed_explanation,
      evidenceLevel: row.evidence_level,
      evidenceFields: row.evidence_fields,
      reviewDecision: row.review_decision as "approve" | "revise",
    })),
    excludedBudgetProgramIdentityIds: reviewFile.rejectedRows.map(
      (row) => row.budget_program_identity_id
    ),
  };
}

export function buildArchivedBudgetTopicPayload(
  reviewFile: BudgetTopicReviewFile,
  definition: ResolvedBudgetTopicDefinition
): ArchivedBudgetTopicPayload {
  if (definition.topic.publicationStatus !== "archived") {
    throw new Error("published topicをarchive payloadにはできません");
  }
  if (reviewFile.candidateTopicName !== definition.topic.name) {
    throw new Error(
      `review CSVのtopic名が定義と一致しません: ${reviewFile.candidateTopicName}`
    );
  }
  if (reviewFile.pendingRows.length > 0) {
    throw new Error(
      `review_decisionが空欄の候補が${reviewFile.pendingRows.length}件あります`
    );
  }
  if (reviewFile.selectedRows.length > 0) {
    throw new Error("archived topicにapproveまたはreviseされた候補があります");
  }
  return {
    fiscalYear: definition.fiscalYear,
    budgetType: definition.budgetType,
    categorySlug: definition.categorySlug,
    topic: {
      slug: definition.topic.slug,
      name: definition.topic.name,
      shortDescription: definition.topic.shortDescription,
      topicKind: definition.topic.topicKind,
      editorialNote: definition.topic.editorialNote,
    },
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
  assertSafeBudgetTopicPublishTarget({
    supabaseUrl,
    environmentName: process.env.BUDGET_IMPORT_ENVIRONMENT,
    productionConfirmation: process.env.BUDGET_TOPIC_PUBLISH_CONFIRMATION,
    githubActions: process.env.GITHUB_ACTIONS,
    githubRefName: process.env.GITHUB_REF_NAME,
    githubEventName: process.env.GITHUB_EVENT_NAME,
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

export async function archiveReviewedBudgetTopic(
  payload: ArchivedBudgetTopicPayload,
  client?: AdminClient
): Promise<ArchiveReviewedBudgetTopicResult> {
  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  requireEnvironment("SUPABASE_SECRET_KEY");
  assertSafeBudgetTopicPublishTarget({
    supabaseUrl,
    environmentName: process.env.BUDGET_IMPORT_ENVIRONMENT,
    productionConfirmation: process.env.BUDGET_TOPIC_PUBLISH_CONFIRMATION,
    githubActions: process.env.GITHUB_ACTIONS,
    githubRefName: process.env.GITHUB_REF_NAME,
    githubEventName: process.env.GITHUB_EVENT_NAME,
  });

  const adminClient = client ?? (createAdminClient() as AdminClient);
  const { data, error } = await adminClient.rpc(
    "archive_reviewed_budget_topic",
    {
      p_payload: payload as unknown as Json,
    }
  );
  if (error) {
    throw new Error(`課題・事業関係の非公開化に失敗しました: ${error.message}`);
  }
  return archiveResultSchema.parse(data);
}
