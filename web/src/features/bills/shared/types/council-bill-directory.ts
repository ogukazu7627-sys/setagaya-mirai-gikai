import type {
  RecommendationCategoryId,
  RecommendationCategoryOption,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { BillCardData, BillItemType } from ".";
import type { CouncilSearchContentType } from "./council-search";

export type CouncilBillDirectoryEntry = {
  id: string;
  itemType: BillItemType;
  majorCategory: string | null;
  committeeName: string | null;
  submittedDate: string | null;
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
