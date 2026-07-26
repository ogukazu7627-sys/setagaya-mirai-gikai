import {
  type BillSeoSource,
  buildBillSeoMetadata,
  countSeoCharacters,
  normalizeSeoText,
} from "./bill-seo-metadata";

export const BILL_SEO_AUDIT_LIMITS = {
  titleMax: 60,
  descriptionMin: 50,
  descriptionMax: 160,
} as const;

export type BillSeoAuditIssueCode =
  | "missing_friendly_title"
  | "missing_summary"
  | "duplicate_title"
  | "duplicate_description"
  | "title_too_long"
  | "description_too_short"
  | "description_too_long";

export type BillSeoAuditIssue = {
  code: BillSeoAuditIssueCode;
  severity: "error" | "warning";
  message: string;
};

export type BillSeoAuditRecord = BillSeoSource & {
  id: string;
};

export type BillSeoAuditEntry = {
  id: string;
  name: string;
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  issues: BillSeoAuditIssue[];
};

export type BillSeoAuditResult = {
  total: number;
  errorCount: number;
  warningCount: number;
  entriesWithIssues: number;
  entries: BillSeoAuditEntry[];
};

function addDuplicateIssues(
  entries: BillSeoAuditEntry[],
  field: "title" | "description",
  code: "duplicate_title" | "duplicate_description"
) {
  const indexesByValue = new Map<string, number[]>();

  entries.forEach((entry, index) => {
    const indexes = indexesByValue.get(entry[field]) ?? [];
    indexes.push(index);
    indexesByValue.set(entry[field], indexes);
  });

  for (const indexes of indexesByValue.values()) {
    if (indexes.length < 2) {
      continue;
    }

    for (const index of indexes) {
      entries[index]?.issues.push({
        code,
        severity: "error",
        message:
          field === "title"
            ? "SEOタイトルがほかの公開案件と重複しています。"
            : "SEO説明文がほかの公開案件と重複しています。",
      });
    }
  }
}

export function auditBillSeoRecords(
  records: BillSeoAuditRecord[]
): BillSeoAuditResult {
  const entries = records.map<BillSeoAuditEntry>((record) => {
    const metadata = buildBillSeoMetadata(record);
    const titleLength = countSeoCharacters(metadata.title);
    const descriptionLength = countSeoCharacters(metadata.description);
    const issues: BillSeoAuditIssue[] = [];

    if (!normalizeSeoText(record.bill_content?.title)) {
      issues.push({
        code: "missing_friendly_title",
        severity: "error",
        message: "normal版の読みやすい案件名がありません。",
      });
    }

    if (!normalizeSeoText(record.bill_content?.summary)) {
      issues.push({
        code: "missing_summary",
        severity: "error",
        message: "normal版のsummaryがありません。",
      });
    }

    if (titleLength > BILL_SEO_AUDIT_LIMITS.titleMax) {
      issues.push({
        code: "title_too_long",
        severity: "warning",
        message: `SEOタイトルが${BILL_SEO_AUDIT_LIMITS.titleMax}文字を超えています。`,
      });
    }

    if (descriptionLength < BILL_SEO_AUDIT_LIMITS.descriptionMin) {
      issues.push({
        code: "description_too_short",
        severity: "warning",
        message: `SEO説明文が${BILL_SEO_AUDIT_LIMITS.descriptionMin}文字未満です。`,
      });
    }

    if (descriptionLength > BILL_SEO_AUDIT_LIMITS.descriptionMax) {
      issues.push({
        code: "description_too_long",
        severity: "warning",
        message: `SEO説明文が${BILL_SEO_AUDIT_LIMITS.descriptionMax}文字を超えています。`,
      });
    }

    return {
      id: record.id,
      name: record.name,
      title: metadata.title,
      titleLength,
      description: metadata.description,
      descriptionLength,
      issues,
    };
  });

  addDuplicateIssues(entries, "title", "duplicate_title");
  addDuplicateIssues(entries, "description", "duplicate_description");

  return {
    total: entries.length,
    errorCount: entries.reduce(
      (count, entry) =>
        count +
        entry.issues.filter((issue) => issue.severity === "error").length,
      0
    ),
    warningCount: entries.reduce(
      (count, entry) =>
        count +
        entry.issues.filter((issue) => issue.severity === "warning").length,
      0
    ),
    entriesWithIssues: entries.filter((entry) => entry.issues.length > 0)
      .length,
    entries,
  };
}
