import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  CouncilSearchIndexSource,
  CouncilSearchIndexTag,
} from "../../shared/types/council-search-index";

export type ClaimedCouncilSearchIndexJob = {
  billId: string;
  requestedAt: string;
  attemptCount: number;
};

export type ExistingCouncilSearchChunk = {
  id: string;
  chunkKey: string;
  contentHash: string;
  embeddingModel: string;
};

export type CouncilSearchIndexSourceResult = {
  source: CouncilSearchIndexSource | null;
  publicationCategory: string | null;
  publishStatus: string | null;
  sessionStartDate: string | null;
};

type BillSourceRow = {
  id: string;
  diet_session_id: string | null;
  name: string;
  item_type: CouncilSearchIndexSource["itemType"];
  major_category: string | null;
  status_label: string | null;
  status_note: string | null;
  submitted_date: string | null;
  publish_status: string;
  publication_category: string;
  diet_session:
    | { id: string; start_date: string }
    | Array<{ id: string; start_date: string }>
    | null;
};

type TagRelationRow = {
  tags:
    | {
        label: string;
        major_category: string | null;
        description: string | null;
      }
    | Array<{
        label: string;
        major_category: string | null;
        description: string | null;
      }>
    | null;
};

export async function claimCouncilSearchIndexJobs(
  limit: number
): Promise<ClaimedCouncilSearchIndexJob[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "claim_council_search_index_jobs",
    { p_limit: limit }
  );
  if (error) {
    throw new Error(`Failed to claim council search jobs: ${error.message}`);
  }
  return (data ?? []).map((job) => ({
    billId: job.bill_id,
    requestedAt: job.requested_at,
    attemptCount: job.attempt_count,
  }));
}

export async function findCouncilSearchIndexSource(
  billId: string
): Promise<CouncilSearchIndexSourceResult> {
  const supabase = createAdminClient();
  const [billResult, contentResult, tagsResult, statementsResult] =
    await Promise.all([
      supabase
        .from("bills")
        .select(
          `
            id,
            diet_session_id,
            name,
            item_type,
            major_category,
            status_label,
            status_note,
            submitted_date,
            publish_status,
            publication_category,
            diet_session:diet_sessions (
              id,
              start_date
            )
          `
        )
        .eq("id", billId)
        .maybeSingle(),
      supabase
        .from("bill_contents")
        .select("title, summary, content")
        .eq("bill_id", billId)
        .eq("difficulty_level", "normal")
        .maybeSingle(),
      supabase
        .from("bills_tags")
        .select("tags(label, major_category, description)")
        .eq("bill_id", billId),
      supabase
        .from("councilor_bill_statements")
        .select(
          "statement_index, councilor_id, councilor_name, party_or_group, content_text"
        )
        .eq("bill_id", billId)
        .eq("difficulty_level", "normal")
        .order("statement_index", { ascending: true }),
    ]);

  const firstError =
    billResult.error ??
    contentResult.error ??
    tagsResult.error ??
    statementsResult.error;
  if (firstError) {
    throw new Error(
      `Failed to fetch council search index source: ${firstError.message}`
    );
  }

  const bill = billResult.data as unknown as BillSourceRow | null;
  const session = Array.isArray(bill?.diet_session)
    ? bill.diet_session[0]
    : bill?.diet_session;
  if (!bill || !contentResult.data || !bill.diet_session_id) {
    return {
      source: null,
      publicationCategory: bill?.publication_category ?? null,
      publishStatus: bill?.publish_status ?? null,
      sessionStartDate: session?.start_date ?? null,
    };
  }

  return {
    source: {
      billId: bill.id,
      dietSessionId: bill.diet_session_id,
      name: bill.name,
      itemType: bill.item_type,
      majorCategory: bill.major_category,
      statusLabel: bill.status_label,
      statusNote: bill.status_note,
      submittedDate: bill.submitted_date,
      title: contentResult.data.title,
      summary: contentResult.data.summary,
      content: contentResult.data.content,
      tags: ((tagsResult.data ?? []) as unknown as TagRelationRow[]).flatMap(
        toSearchIndexTag
      ),
      statements: (statementsResult.data ?? []).map((statement) => ({
        statementIndex: statement.statement_index,
        councilorId: statement.councilor_id,
        councilorName: statement.councilor_name,
        partyOrGroup: statement.party_or_group,
        contentText: statement.content_text,
      })),
    },
    publicationCategory: bill.publication_category,
    publishStatus: bill.publish_status,
    sessionStartDate: session?.start_date ?? null,
  };
}

export async function findExistingCouncilSearchChunks(
  billId: string
): Promise<ExistingCouncilSearchChunk[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_search_chunks")
    .select("id, chunk_key, content_hash, embedding_model")
    .eq("bill_id", billId);
  if (error) {
    throw new Error(`Failed to fetch council search chunks: ${error.message}`);
  }
  return (data ?? []).map((chunk) => ({
    id: chunk.id,
    chunkKey: chunk.chunk_key,
    contentHash: chunk.content_hash,
    embeddingModel: chunk.embedding_model,
  }));
}

export async function upsertCouncilSearchChunks(
  rows: Array<{
    bill_id: string;
    diet_session_id: string;
    chunk_key: string;
    chunk_kind: "overview" | "content" | "councilor_statement";
    heading: string | null;
    content: string;
    normalized_content: string;
    councilor_id: string | null;
    councilor_name: string | null;
    item_type: CouncilSearchIndexSource["itemType"];
    major_category: string | null;
    committee_name: string | null;
    embedding: string;
    content_hash: string;
    embedding_model: string;
    indexed_at: string;
  }>
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("council_search_chunks").upsert(rows, {
    onConflict: "bill_id,chunk_key",
  });
  if (error) {
    throw new Error(`Failed to upsert council search chunks: ${error.message}`);
  }
}

export async function deleteCouncilSearchChunksByIds(
  chunkIds: string[]
): Promise<void> {
  if (chunkIds.length === 0) {
    return;
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_search_chunks")
    .delete()
    .in("id", chunkIds);
  if (error) {
    throw new Error(`Failed to delete stale search chunks: ${error.message}`);
  }
}

export async function deleteCouncilSearchChunksByBillId(
  billId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_search_chunks")
    .delete()
    .eq("bill_id", billId);
  if (error) {
    throw new Error(`Failed to delete bill search chunks: ${error.message}`);
  }
}

export async function completeCouncilSearchIndexJob(
  job: ClaimedCouncilSearchIndexJob
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_search_index_jobs")
    .delete()
    .eq("bill_id", job.billId)
    .eq("status", "processing")
    .eq("requested_at", job.requestedAt);
  if (error) {
    throw new Error(`Failed to complete council search job: ${error.message}`);
  }
}

export async function failCouncilSearchIndexJob(
  job: ClaimedCouncilSearchIndexJob,
  errorMessage: string,
  availableAt: string
): Promise<void> {
  const supabase = createAdminClient();
  const permanentlyFailed = job.attemptCount >= 5;
  const { error } = await supabase
    .from("council_search_index_jobs")
    .update({
      status: permanentlyFailed ? "failed" : "pending",
      available_at: availableAt,
      locked_at: null,
      last_error: errorMessage.slice(0, 500),
    })
    .eq("bill_id", job.billId)
    .eq("status", "processing")
    .eq("requested_at", job.requestedAt);
  if (error) {
    throw new Error(
      `Failed to reschedule council search job: ${error.message}`
    );
  }
}

function toSearchIndexTag(row: TagRelationRow): CouncilSearchIndexTag[] {
  const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
  return tag
    ? [
        {
          label: tag.label,
          majorCategory: tag.major_category,
          description: tag.description,
        },
      ]
    : [];
}
