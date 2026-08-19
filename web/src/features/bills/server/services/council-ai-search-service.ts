import "server-only";

import { embed } from "ai";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { getRecommendationCategoryById } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { getJapanTime } from "@/lib/utils/date";
import {
  COUNCIL_SEARCH_EMBEDDING_DIMENSIONS,
  COUNCIL_SEARCH_EMBEDDING_MODEL,
  COUNCIL_SEARCH_EMBEDDING_TIMEOUT_MS,
  COUNCIL_SEARCH_MAX_RESULTS,
  COUNCIL_SEARCH_SIMILARITY_THRESHOLD,
} from "../../shared/constants/council-ai-search";
import type {
  CouncilAiSearchRequest,
  CouncilAiSearchResponse,
  CouncilSearchCouncilor,
} from "../../shared/types/council-ai-search";
import { buildCouncilSearchIntent } from "../../shared/utils/council-search-intent";
import {
  findCouncilSearchCouncilors,
  findRankedCouncilSearchBills,
} from "../repositories/council-search-repository";
import { loadCouncilBillCardsByIds } from "../loaders/load-council-bill-cards";
import { formatPostgresVector } from "../utils/council-search-embedding";

type CouncilAiSearchDependencies = {
  now?: () => Date;
  findSessions?: typeof findDietSessionsStartingBetween;
  findCouncilors?: () => Promise<CouncilSearchCouncilor[]>;
  search?: typeof findRankedCouncilSearchBills;
  embedQuery?: (value: string) => Promise<number[]>;
  getDifficulty?: typeof getDifficultyLevel;
  loadCards?: typeof loadCouncilBillCardsByIds;
};

export async function searchCouncilBills(
  input: CouncilAiSearchRequest,
  dependencies: CouncilAiSearchDependencies = {}
): Promise<CouncilAiSearchResponse> {
  const now = dependencies.now?.() ?? getJapanTime();
  const currentYear = getCalendarYearFromDate(now);
  const range = getCalendarYearRange(currentYear);
  const [sessions, councilors] = await Promise.all([
    (dependencies.findSessions ?? findDietSessionsStartingBetween)(
      range.startDate,
      range.endDate
    ),
    (dependencies.findCouncilors ?? findCouncilSearchCouncilors)(),
  ]);
  if (sessions.length === 0) {
    return {
      billIds: [],
      bills: [],
      total: 0,
      mode: "keyword-fallback",
    };
  }

  const intent = buildCouncilSearchIntent(input.query, councilors);
  if (intent.hasUnresolvedCouncilorMention) {
    return {
      billIds: [],
      bills: [],
      total: 0,
      mode: "keyword-fallback",
    };
  }
  let queryEmbedding: string | null = null;
  let mode: CouncilAiSearchResponse["mode"] = "hybrid";
  try {
    const vector = await (dependencies.embedQuery ?? embedCouncilSearchQuery)(
      intent.embeddingText
    );
    queryEmbedding = formatPostgresVector(vector);
  } catch (error) {
    // 検索語は残さず、縮退した事実と理由だけを記録する。
    console.error(
      "[council-search] embedding unavailable, falling back to keyword search:",
      describeError(error)
    );
    mode = "keyword-fallback";
  }

  const theme = input.themeId
    ? getRecommendationCategoryById(input.themeId)
    : null;
  const search = dependencies.search ?? findRankedCouncilSearchBills;
  const searchInput = {
    queryTerms: intent.terms,
    dietSessionIds: sessions.map((session) => session.id),
    contentType: input.contentType === "all" ? null : input.contentType,
    majorCategory: theme?.label ?? null,
    committeeName: input.committeeName || null,
    councilorIds: intent.councilorIds,
    councilorNames: intent.councilorNames,
    similarityThreshold: COUNCIL_SEARCH_SIMILARITY_THRESHOLD,
    limit: COUNCIL_SEARCH_MAX_RESULTS,
  };
  let results: Awaited<ReturnType<typeof search>>;
  try {
    results = await search({ ...searchInput, queryEmbedding });
  } catch (error) {
    // ベクトル検索だけが落ちている場合があるため、キーワードのみで一度だけ引き直す。
    if (queryEmbedding == null) {
      throw error;
    }
    console.error(
      "[council-search] vector search failed, retrying with keywords only:",
      describeError(error)
    );
    results = await search({ ...searchInput, queryEmbedding: null });
    mode = "keyword-fallback";
  }
  const billIds = results.map((result) => result.billId);
  const difficultyLevel = await (
    dependencies.getDifficulty ?? getDifficultyLevel
  )();
  const bills = await (dependencies.loadCards ?? loadCouncilBillCardsByIds)(
    billIds,
    sessions.map((session) => session.id),
    difficultyLevel
  );

  return {
    billIds,
    bills,
    total: bills.length,
    mode,
  };
}

/** 検索語やユーザー情報を残さず、原因追跡に必要な情報だけを取り出す。 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

async function embedCouncilSearchQuery(value: string): Promise<number[]> {
  const result = await embed({
    model: COUNCIL_SEARCH_EMBEDDING_MODEL,
    value,
    providerOptions: {
      openai: { dimensions: COUNCIL_SEARCH_EMBEDDING_DIMENSIONS },
    },
    // 再試行すると待ち時間が倍になり、縮退が遅れるだけなので1回で見切る。
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(COUNCIL_SEARCH_EMBEDDING_TIMEOUT_MS),
  });
  return result.embedding;
}
