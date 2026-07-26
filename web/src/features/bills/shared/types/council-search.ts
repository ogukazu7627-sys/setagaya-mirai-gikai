import type { BillCardData, BillItemType } from ".";

export type CouncilSearchContentType = "all" | BillItemType;

export type CouncilSearchBillDocument = {
  kind: "bill";
  id: string;
  title: string;
  officialName: string;
  summary: string;
  itemType: BillItemType;
  majorCategoryId: string | null;
  majorCategoryLabel: string | null;
  committeeName: string | null;
  tags: string[];
  submittedDate: string | null;
  thumbnailUrl: string | null;
  card: BillCardData;
};

export type CouncilSearchDocument = CouncilSearchBillDocument;

export type CouncilSearchFilters = {
  contentType: CouncilSearchContentType;
  themeId: string;
  committeeName: string;
};

export type CouncilSearchInitialFilters = Partial<
  Record<"type" | "theme" | "committee", string>
>;
