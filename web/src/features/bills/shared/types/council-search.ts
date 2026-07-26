import type { BillItemType } from ".";

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
};

export type CouncilSearchBillRow = {
  id: string;
  name: string;
  item_type: BillItemType;
  major_category: string | null;
  status_note: string | null;
  submitted_date: string | null;
  bill_contents:
    | { title: string; summary: string }
    | Array<{ title: string; summary: string }>
    | null;
  bills_tags: Array<{
    tags:
      | { label: string; major_category: string | null }
      | Array<{ label: string; major_category: string | null }>
      | null;
  }> | null;
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
