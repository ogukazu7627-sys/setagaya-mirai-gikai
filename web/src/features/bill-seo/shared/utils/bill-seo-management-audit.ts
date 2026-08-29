import type { BillSeoProfile } from "../types";
import { BILL_SEO_GENERATION_LIMITS } from "./bill-seo-generation";

const SITE_SUFFIX_LENGTH = Array.from(" | みらい議会＠世田谷区").length;

export type ManagedBillSeoAuditIssueCode =
  | "missing"
  | "not_ready"
  | "stale"
  | "title_too_long"
  | "description_too_short"
  | "description_too_long"
  | "keyword_count"
  | "duplicate_title"
  | "duplicate_description";

export type ManagedBillSeoAuditIssue = {
  code: ManagedBillSeoAuditIssueCode;
  severity: "error" | "warning";
  message: string;
};

export type ManagedBillSeoAuditInput = {
  id: string;
  name: string;
  publishStatus: string;
  currentSourceHash: string;
  faqCount: number;
  profile: BillSeoProfile | null;
};

export type ManagedBillSeoAuditEntry = ManagedBillSeoAuditInput & {
  titleLength: number | null;
  descriptionLength: number | null;
  issues: ManagedBillSeoAuditIssue[];
};

export function auditManagedBillSeoEntries(
  inputs: ManagedBillSeoAuditInput[]
): ManagedBillSeoAuditEntry[] {
  const entries = inputs.map<ManagedBillSeoAuditEntry>((input) => {
    const titleLength = input.profile?.seoTitle
      ? Array.from(input.profile.seoTitle).length + SITE_SUFFIX_LENGTH
      : null;
    const descriptionLength = input.profile?.seoDescription
      ? Array.from(input.profile.seoDescription).length
      : null;
    const issues: ManagedBillSeoAuditIssue[] = [];

    if (!input.profile) {
      issues.push({
        code: "missing",
        severity: "error",
        message: "案件別SEOが未生成です。",
      });
    } else {
      if (input.profile.status !== "ready") {
        issues.push({
          code: "not_ready",
          severity: "error",
          message:
            input.profile.status === "failed"
              ? "直近のSEO生成に失敗しています。"
              : "案件別SEOが生成待ちまたは生成中です。",
        });
      }
      if (input.profile.sourceHash !== input.currentSourceHash) {
        issues.push({
          code: "stale",
          severity: "error",
          message: "本文・タグ・出典の更新後にSEOが再生成されていません。",
        });
      }
      if (titleLength !== null && titleLength > 60) {
        issues.push({
          code: "title_too_long",
          severity: "warning",
          message: "サイト名を含むSEOタイトルが60文字を超えています。",
        });
      }
      if (
        descriptionLength !== null &&
        descriptionLength < BILL_SEO_GENERATION_LIMITS.descriptionMin
      ) {
        issues.push({
          code: "description_too_short",
          severity: "warning",
          message: "SEO説明文が50文字未満です。",
        });
      }
      if (
        descriptionLength !== null &&
        descriptionLength > BILL_SEO_GENERATION_LIMITS.descriptionMax
      ) {
        issues.push({
          code: "description_too_long",
          severity: "warning",
          message: "SEO説明文が160文字を超えています。",
        });
      }
      const keywordCount = input.profile.seoKeywords.length;
      if (
        keywordCount < BILL_SEO_GENERATION_LIMITS.keywordMin ||
        keywordCount > BILL_SEO_GENERATION_LIMITS.keywordMax
      ) {
        issues.push({
          code: "keyword_count",
          severity: "warning",
          message: "SEOキーワードが3〜8件の範囲外です。",
        });
      }
    }

    return { ...input, titleLength, descriptionLength, issues };
  });

  addDuplicateIssue(entries, "seoTitle", "duplicate_title");
  addDuplicateIssue(entries, "seoDescription", "duplicate_description");
  return entries;
}

function addDuplicateIssue(
  entries: ManagedBillSeoAuditEntry[],
  field: "seoTitle" | "seoDescription",
  code: "duplicate_title" | "duplicate_description"
) {
  const entriesByValue = new Map<string, ManagedBillSeoAuditEntry[]>();
  for (const entry of entries) {
    const value = entry.profile?.[field]?.trim();
    if (!value) continue;
    const matches = entriesByValue.get(value) ?? [];
    matches.push(entry);
    entriesByValue.set(value, matches);
  }

  for (const matches of entriesByValue.values()) {
    if (matches.length < 2) continue;
    for (const entry of matches) {
      entry.issues.push({
        code,
        severity: "error",
        message:
          field === "seoTitle"
            ? "SEOタイトルが別案件と重複しています。"
            : "SEO説明文が別案件と重複しています。",
      });
    }
  }
}
