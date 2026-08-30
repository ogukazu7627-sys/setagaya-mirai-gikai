import type { BillItemType, BillSource } from "@/features/bills/shared/types";

export type BillSeoGenerationStatus =
  | "pending"
  | "generating"
  | "ready"
  | "failed";

export type BillSeoProfile = {
  billId: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  status: BillSeoGenerationStatus;
  sourceHash: string | null;
  generatedAt: string | null;
  generationStartedAt: string | null;
  model: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type BillSeoSourceData = {
  billId: string;
  formalName: string;
  itemType: BillItemType;
  majorCategory: string | null;
  submittedDate: string | null;
  statusLabel: string | null;
  statusNote: string | null;
  dietSessionName: string | null;
  normalTitle: string;
  normalSummary: string;
  normalContent: string;
  tags: string[];
  sources: BillSource[];
};

export type BillSeoGeneratedFields = {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
};

export type BillSeoGenerationResult = {
  status: "ready" | "skipped" | "failed";
  profile: BillSeoProfile | null;
  warning: string | null;
};
