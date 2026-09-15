import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";

export type GeneralQuestionContent = {
  difficultyLevel: DifficultyLevelEnum;
  title: string;
  summary: string;
  content: string;
};

export type GeneralQuestionCouncilor = {
  id: string;
  displayName: string;
  iconUrl: string | null;
};

export type GeneralQuestionDietSession = {
  id: string;
  name: string;
  slug: string | null;
  startDate: string | null;
};

export type PublishedGeneralQuestion = {
  id: string;
  name: string;
  categoryId: RecommendationCategoryId;
  majorCategory: string;
  submittedDate: string | null;
  publishedAt: string | null;
  updatedAt: string;
  dietSession: GeneralQuestionDietSession | null;
  partyOrGroup: string | null;
  councilor: GeneralQuestionCouncilor;
  contents: Partial<Record<DifficultyLevelEnum, GeneralQuestionContent>>;
};

export type GeneralQuestionCategoryCardData = {
  categoryId: RecommendationCategoryId;
  name: string;
  majorCategory: string;
  description: string;
  year: number;
  dietSession: GeneralQuestionDietSession;
  questionCount: number;
  latestSubmittedDate: string | null;
  focusBillId?: string | null;
};

export type GeneralQuestionCategoryReference = {
  categoryId: RecommendationCategoryId;
  year: number;
  sessionKey: string;
  sessionName: string;
  sessionStartDate: string;
  updatedAt: string;
};
