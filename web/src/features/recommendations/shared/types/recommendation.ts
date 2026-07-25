import type { BillWithContent } from "@/features/bills/shared/types";
import type {
  RecommendationCategoryId,
  RecommendationSmallTag,
} from "../constants/recommendation-taxonomy";

export type RecommendationSource = "selected-subcategory" | "parent-category";

export type RecommendationCandidate = {
  id: string;
  tags: RecommendationSmallTag[];
};

export type RecommendationPick = {
  billId: string;
  source: RecommendationSource;
};

export type RecommendationAvailability = Record<RecommendationSmallTag, number>;

export type StoredRecommendationProfile = {
  installationId: string;
  selectedParentCategoryIds: RecommendationCategoryId[];
  selectedSmallTags: RecommendationSmallTag[];
  completedAt: string;
  preferenceVersion: number;
};

export type TodayRecommendationsResponse = {
  recommendationDate: string;
  bills: BillWithContent[];
  hasRemainingCandidates: boolean;
  selectedSmallTags: RecommendationSmallTag[];
  selectedParentCategoryIds: RecommendationCategoryId[];
  preferenceVersion: number;
  pushEnabled: boolean;
  vapidPublicKey: string | null;
};
