import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { BillItemType } from ".";
import type { CouncilDirectoryItem } from "./council-bill-directory";

export type CouncilKeywordSearchContentType = "all" | BillItemType;

export type CouncilKeywordSearchRequest = {
  installationId: string;
  query: string;
  contentType: CouncilKeywordSearchContentType;
  themeId: RecommendationCategoryId | "";
  committeeName: string;
};

export type CouncilKeywordSearchResponse = {
  items: CouncilDirectoryItem[];
  total: number;
};
