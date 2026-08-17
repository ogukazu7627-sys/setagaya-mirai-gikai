import "server-only";

import { embedMany } from "ai";
import { getCalendarYearFromDate } from "@/features/diet-sessions/shared/utils/calendar-year";
import { getJapanTime } from "@/lib/utils/date";
import {
  COUNCIL_SEARCH_EMBEDDING_DIMENSIONS,
  COUNCIL_SEARCH_EMBEDDING_MODEL,
} from "../../shared/constants/council-ai-search";
import { buildCouncilSearchChunks } from "../../shared/utils/build-council-search-chunks";
import {
  type ClaimedCouncilSearchIndexJob,
  claimCouncilSearchIndexJobs,
  completeCouncilSearchIndexJob,
  deleteCouncilSearchChunksByBillId,
  deleteCouncilSearchChunksByIds,
  failCouncilSearchIndexJob,
  findCouncilSearchIndexSource,
  findExistingCouncilSearchChunks,
  upsertCouncilSearchChunks,
} from "../repositories/council-search-index-repository";
import {
  createCouncilSearchContentHash,
  formatPostgresVector,
} from "../utils/council-search-embedding";

type CouncilSearchIndexDependencies = {
  embedValues?: (values: string[]) => Promise<number[][]>;
  now?: () => Date;
};

export async function processCouncilSearchIndexJobs(
  input: {
    limit?: number;
    concurrency?: number;
  } = {},
  dependencies: CouncilSearchIndexDependencies = {}
): Promise<{ claimed: number; completed: number; failed: number }> {
  const jobs = await claimCouncilSearchIndexJobs(input.limit ?? 20);
  let completed = 0;
  let failed = 0;

  await mapWithConcurrency(jobs, input.concurrency ?? 4, async (job) => {
    try {
      await syncCouncilSearchIndexForBill(job.billId, dependencies);
      await completeCouncilSearchIndexJob(job);
      completed += 1;
    } catch (error) {
      failed += 1;
      await failCouncilSearchIndexJob(
        job,
        safeErrorMessage(error),
        getRetryAvailableAt(job, dependencies.now?.() ?? new Date())
      );
    }
  });

  return { claimed: jobs.length, completed, failed };
}

export async function syncCouncilSearchIndexForBill(
  billId: string,
  dependencies: CouncilSearchIndexDependencies = {}
): Promise<{ embedded: number; deleted: number }> {
  const now = dependencies.now?.() ?? getJapanTime();
  const sourceResult = await findCouncilSearchIndexSource(billId);
  const isCurrentYear =
    sourceResult.sessionStartDate != null &&
    getCalendarYearFromDate(sourceResult.sessionStartDate) ===
      getCalendarYearFromDate(now);
  if (
    sourceResult.publishStatus !== "published" ||
    sourceResult.publicationCategory === "budget" ||
    !sourceResult.source ||
    !isCurrentYear
  ) {
    const existing = await findExistingCouncilSearchChunks(billId);
    await deleteCouncilSearchChunksByBillId(billId);
    return { embedded: 0, deleted: existing.length };
  }

  const drafts = buildCouncilSearchChunks(sourceResult.source);
  const existing = await findExistingCouncilSearchChunks(billId);
  const existingByKey = new Map(
    existing.map((chunk) => [chunk.chunkKey, chunk])
  );
  const prepared = drafts.map((draft) => ({
    draft,
    contentHash: createCouncilSearchContentHash(draft.content),
  }));
  const changed = prepared.filter(({ draft, contentHash }) => {
    const current = existingByKey.get(draft.chunkKey);
    return (
      current?.contentHash !== contentHash ||
      current.embeddingModel !== COUNCIL_SEARCH_EMBEDDING_MODEL
    );
  });
  const staleIds = existing
    .filter(
      (chunk) =>
        !prepared.some(({ draft }) => draft.chunkKey === chunk.chunkKey)
    )
    .map((chunk) => chunk.id);
  const embeddings =
    changed.length > 0
      ? await (dependencies.embedValues ?? embedCouncilSearchValues)(
          changed.map(({ draft }) => draft.content)
        )
      : [];
  if (embeddings.length !== changed.length) {
    throw new Error("Embedding count did not match council search chunks");
  }

  const indexedAt = now.toISOString();
  await upsertCouncilSearchChunks(
    changed.map(({ draft, contentHash }, index) => ({
      bill_id: draft.billId,
      diet_session_id: draft.dietSessionId,
      chunk_key: draft.chunkKey,
      chunk_kind: draft.chunkKind,
      heading: draft.heading,
      content: draft.content,
      normalized_content: draft.normalizedContent,
      councilor_id: draft.councilorId,
      councilor_name: draft.councilorName,
      item_type: draft.itemType,
      major_category: draft.majorCategory,
      committee_name: draft.committeeName,
      embedding: formatPostgresVector(embeddings[index] ?? []),
      content_hash: contentHash,
      embedding_model: COUNCIL_SEARCH_EMBEDDING_MODEL,
      indexed_at: indexedAt,
    }))
  );
  await deleteCouncilSearchChunksByIds(staleIds);

  return { embedded: changed.length, deleted: staleIds.length };
}

async function embedCouncilSearchValues(values: string[]): Promise<number[][]> {
  const result = await embedMany({
    model: COUNCIL_SEARCH_EMBEDDING_MODEL,
    values,
    providerOptions: {
      openai: { dimensions: COUNCIL_SEARCH_EMBEDDING_DIMENSIONS },
    },
    maxParallelCalls: 2,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(20_000),
  });
  return result.embeddings;
}

function getRetryAvailableAt(
  job: ClaimedCouncilSearchIndexJob,
  now: Date
): string {
  const delayMinutes = Math.min(60, 2 ** Math.max(0, job.attemptCount - 1));
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Council search index failed";
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  callback: (value: T) => Promise<void>
): Promise<void> {
  const queue = [...values];
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), queue.length) },
    async () => {
      while (queue.length > 0) {
        const value = queue.shift();
        if (value !== undefined) {
          await callback(value);
        }
      }
    }
  );
  await Promise.all(workers);
}
