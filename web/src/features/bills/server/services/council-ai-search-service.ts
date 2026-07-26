import "server-only";

import { embed } from "ai";
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
import { formatPostgresVector } from "../utils/council-search-embedding";

type CouncilAiSearchDependencies = {
  now?: () => Date;
  findSessions?: typeof findDietSessionsStartingBetween;
  findCouncilors?: () => Promise<CouncilSearchCouncilor[]>;
  search?: typeof findRankedCouncilSearchBills;
  embedQuery?: (value: string) => Promise<number[]>;
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
    return { billIds: [], total: 0, mode: "keyword-fallback" };
  }

  const intent = buildCouncilSearchIntent(input.query, councilors);
  if (intent.hasUnresolvedCouncilorMention) {
    return { billIds: [], total: 0, mode: "keyword-fallback" };
  }
  let queryEmbedding: string | null = null;
  let mode: CouncilAiSearchResponse["mode"] = "hybrid";
  try {
    const vector = await (dependencies.embedQuery ?? embedCouncilSearchQuery)(
      intent.embeddingText
    );
    queryEmbedding = formatPostgresVector(vector);
  } catch {
    mode = "keyword-fallback";
  }

  const theme = input.themeId
    ? getRecommendationCategoryById(input.themeId)
    : null;
  const results = await (dependencies.search ?? findRankedCouncilSearchBills)({
    queryEmbedding,
    queryTerms: intent.terms,
    dietSessionIds: sessions.map((session) => session.id),
    contentType: input.contentType === "all" ? null : input.contentType,
    majorCategory: theme?.label ?? null,
    committeeName: input.committeeName || null,
    councilorIds: intent.councilorIds,
    councilorNames: intent.councilorNames,
    similarityThreshold: COUNCIL_SEARCH_SIMILARITY_THRESHOLD,
    limit: COUNCIL_SEARCH_MAX_RESULTS,
  });

  return {
    billIds: results.map((result) => result.billId),
    total: results.length,
    mode,
  };
}

async function embedCouncilSearchQuery(value: string): Promise<number[]> {
  const result = await embed({
    model: COUNCIL_SEARCH_EMBEDDING_MODEL,
    value,
    providerOptions: {
      openai: { dimensions: COUNCIL_SEARCH_EMBEDDING_DIMENSIONS },
    },
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(10_000),
  });
  return result.embedding;
}
