import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { BillItemType } from "../../shared/types";
import type { CouncilSearchCouncilor } from "../../shared/types/council-ai-search";

export type CouncilSearchRankedBill = {
  billId: string;
  score: number;
  semanticSimilarity: number;
  keywordScore: number;
};

export async function findCouncilSearchCouncilors(): Promise<
  CouncilSearchCouncilor[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilors")
    .select("id, display_name, normalized_name")
    .order("display_name", { ascending: true });
  if (error) {
    throw new Error("Failed to fetch councilors for council search");
  }
  return (data ?? []).map((councilor) => ({
    id: councilor.id,
    displayName: councilor.display_name,
    normalizedName: councilor.normalized_name,
  }));
}

export async function findRankedCouncilSearchBills(input: {
  queryEmbedding: string | null;
  queryTerms: string[];
  dietSessionIds: string[];
  contentType: BillItemType | null;
  majorCategory: string | null;
  committeeName: string | null;
  councilorIds: string[];
  councilorNames: string[];
  similarityThreshold: number;
  limit: number;
}): Promise<CouncilSearchRankedBill[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("search_council_bills", {
    p_query_embedding: input.queryEmbedding,
    p_query_terms: input.queryTerms,
    p_diet_session_ids: input.dietSessionIds,
    p_content_type: input.contentType,
    p_major_category: input.majorCategory,
    p_committee_name: input.committeeName,
    p_councilor_ids: input.councilorIds,
    p_councilor_names: input.councilorNames,
    p_similarity_threshold: input.similarityThreshold,
    p_limit: input.limit,
  });
  if (error) {
    throw new Error("Failed to search council bills");
  }
  return (data ?? []).map((row) => ({
    billId: row.bill_id,
    score: row.score,
    semanticSimilarity: row.semantic_similarity,
    keywordScore: row.keyword_score,
  }));
}
