import type { BillItemType } from ".";

export type CouncilSearchContentType = "all" | BillItemType;

export type CouncilSearchFilters = {
  contentType: CouncilSearchContentType;
  themeId: string;
  committeeName: string;
};

export type CouncilSearchInitialFilters = Partial<
  Record<"type" | "theme" | "committee", string>
>;
