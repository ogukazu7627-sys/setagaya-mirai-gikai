import type { BillItemType } from ".";

export type CouncilSearchIndexTag = {
  label: string;
  majorCategory: string | null;
  description: string | null;
};

export type CouncilSearchIndexStatement = {
  statementIndex: number;
  councilorId: string | null;
  councilorName: string;
  partyOrGroup: string | null;
  contentText: string;
};

export type CouncilSearchIndexSource = {
  billId: string;
  dietSessionId: string;
  name: string;
  itemType: BillItemType;
  majorCategory: string | null;
  statusLabel: string | null;
  statusNote: string | null;
  submittedDate: string | null;
  title: string;
  summary: string;
  content: string;
  tags: CouncilSearchIndexTag[];
  statements: CouncilSearchIndexStatement[];
};

export type CouncilSearchChunkDraft = {
  billId: string;
  dietSessionId: string;
  chunkKey: string;
  chunkKind: "overview" | "content" | "councilor_statement";
  heading: string | null;
  content: string;
  normalizedContent: string;
  councilorId: string | null;
  councilorName: string | null;
  itemType: BillItemType;
  majorCategory: string | null;
  committeeName: string | null;
};
