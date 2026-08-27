import type { GeneralQuestionCategoryCardData } from "@/features/general-questions/shared/types/general-question";
import type {
  RecommendationCategoryId,
  RecommendationCategoryOption,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { BillCardData, BillItemType } from ".";
import type { CouncilSearchContentType } from "./council-search";

export type CouncilBillDirectoryEntry = {
  kind?: "bill";
  id: string;
  itemType: BillItemType;
  majorCategory: string | null;
  committeeName: string | null;
  submittedDate: string | null;
};

export type CouncilGeneralQuestionDirectoryEntry = {
  kind: "general-question-category";
  id: string;
  itemType: "question";
  majorCategory: string;
  committeeName: null;
  submittedDate: string | null;
  category: GeneralQuestionCategoryCardData;
};

export type CouncilDirectoryEntry =
  | CouncilBillDirectoryEntry
  | CouncilGeneralQuestionDirectoryEntry;

export type CouncilDirectoryItem =
  | { kind: "bill"; bill: BillCardData }
  | {
      kind: "general-question-category";
      category: GeneralQuestionCategoryCardData;
    };

export type CouncilBillDirectoryFilters = {
  contentType: CouncilSearchContentType;
  majorCategory: string | null;
  committeeName: string | null;
};

export type CouncilThemeCategorySummary = {
  category: RecommendationCategoryOption;
  count: number;
};

export type CouncilBillCardPage = {
  bills: BillCardData[];
  items: CouncilDirectoryItem[];
  total: number;
  currentPage: number;
  totalPages: number;
};

export type CouncilThemeSectionData = {
  year: number;
  categories: CouncilThemeCategorySummary[];
  initialCategoryId: RecommendationCategoryId | null;
  initialPage: CouncilBillCardPage;
};

type CouncilBillPageRequestBase = {
  installationId: string;
  page: number;
};

export type CouncilBillFilterPageRequest = CouncilBillPageRequestBase & {
  mode: "filters";
  contentType: CouncilSearchContentType;
  themeId: RecommendationCategoryId | "";
  committeeName: string;
};

export type CouncilBillThemePageRequest = CouncilBillPageRequestBase & {
  mode: "theme";
  year: number;
  themeId: RecommendationCategoryId;
};

export type CouncilBillPageRequest =
  | CouncilBillFilterPageRequest
  | CouncilBillThemePageRequest;
