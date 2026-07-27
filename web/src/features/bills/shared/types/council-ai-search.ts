import type { BillCardData, BillItemType } from ".";
import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";

export type CouncilAiSearchContentType = "all" | BillItemType;

export type CouncilAiSearchRequest = {
  installationId: string;
  query: string;
  contentType: CouncilAiSearchContentType;
  themeId: RecommendationCategoryId | "";
  committeeName: string;
};

export type CouncilAiSearchMode = "hybrid" | "keyword-fallback";

export type CouncilAiSearchResponse = {
  billIds: string[];
  bills: BillCardData[];
  total: number;
  mode: CouncilAiSearchMode;
};

export type CouncilSearchCouncilor = {
  id: string | null;
  displayName: string;
  normalizedName: string;
};

export type CouncilSearchIntent = {
  normalizedQuery: string;
  embeddingText: string;
  terms: string[];
  councilorIds: string[];
  councilorNames: string[];
  hasUnresolvedCouncilorMention: boolean;
};
