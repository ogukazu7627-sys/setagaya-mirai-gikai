import type { BillCardData, BillItemType } from ".";

export type CouncilSearchContentType = "all" | BillItemType | "committee";

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

export type CouncilSearchCommitteeDocument = {
  kind: "committee";
  id: string;
  name: string;
  committeeKindLabel: string;
  summary: string;
  responsibilities: string[];
};

export type CouncilSearchDocument =
  | CouncilSearchBillDocument
  | CouncilSearchCommitteeDocument;

export type CouncilSearchFilters = {
  query: string;
  contentType: CouncilSearchContentType;
  themeId: string;
  committeeName: string;
};

export type CouncilSearchInitialFilters = Partial<
  Record<"q" | "type" | "theme" | "committee", string>
>;
