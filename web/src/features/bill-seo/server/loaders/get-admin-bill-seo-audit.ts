import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import type { BillSource } from "@/features/bills/shared/types";
import type { BillSeoSourceData } from "../../shared/types";
import {
  auditManagedBillSeoEntries,
  type ManagedBillSeoAuditEntry,
} from "../../shared/utils/bill-seo-management-audit";
import {
  createBillSeoSourceHash,
  getTokyoDayStartIso,
} from "../../shared/utils/bill-seo-source";
import { extractBillFaq } from "../../shared/utils/extract-bill-faq";
import {
  mapBillSeoProfile,
  sumBillSeoGenerationCostSince,
} from "../repositories/bill-seo-repository";

const PAGE_SIZE = 20;

export type AdminBillSeoAuditFilters = {
  query: string;
  status: "" | "missing" | "pending" | "generating" | "ready" | "failed";
  issue: "" | "error" | "warning" | "stale" | "duplicate" | "faq_missing";
  page: number;
};

export type AdminBillSeoAuditData = {
  entries: ManagedBillSeoAuditEntry[];
  total: number;
  totalPages: number;
  page: number;
  summary: {
    all: number;
    ready: number;
    missing: number;
    failed: number;
    withIssues: number;
    todayCostUsd: number;
  };
};

type BillRow = Pick<
  Database["public"]["Tables"]["bills"]["Row"],
  | "id"
  | "name"
  | "item_type"
  | "major_category"
  | "submitted_date"
  | "status_label"
  | "status_note"
  | "sources"
  | "publish_status"
> & {
  diet_session: { name: string } | Array<{ name: string }> | null;
  bill_contents:
    | { title: string; summary: string; content: string }
    | Array<{ title: string; summary: string; content: string }>;
  bills_tags: Array<{
    tags: { label: string } | Array<{ label: string }> | null;
  }>;
  bill_seo_profiles:
    | Database["public"]["Tables"]["bill_seo_profiles"]["Row"]
    | Array<Database["public"]["Tables"]["bill_seo_profiles"]["Row"]>
    | null;
};

export async function getAdminBillSeoAudit(
  filters: AdminBillSeoAuditFilters
): Promise<AdminBillSeoAuditData> {
  const supabase = createAdminClient();
  const [billResult, todayCostUsd] = await Promise.all([
    supabase
      .from("bills")
      .select(
        `
        id,
        name,
        item_type,
        major_category,
        submitted_date,
        status_label,
        status_note,
        sources,
        publish_status,
        diet_session:diet_sessions(name),
        bill_contents!inner(title, summary, content),
        bills_tags(tags(label)),
        bill_seo_profiles(*)
      `
      )
      .eq("publication_category", "report")
      .eq("bill_contents.difficulty_level", "normal")
      .order("updated_at", { ascending: false }),
    sumBillSeoGenerationCostSince(getTokyoDayStartIso(new Date()), supabase),
  ]);

  if (billResult.error) {
    throw new Error(
      `案件別SEO監査データの取得に失敗しました: ${billResult.error.message}`
    );
  }

  const inputs = ((billResult.data ?? []) as unknown as BillRow[]).flatMap(
    (bill) => {
      const content = first(bill.bill_contents);
      if (!content) return [];
      const dietSession = first(bill.diet_session);
      const profileRow = first(bill.bill_seo_profiles);
      const source: BillSeoSourceData = {
        billId: bill.id,
        formalName: bill.name,
        itemType: bill.item_type,
        majorCategory: bill.major_category,
        submittedDate: bill.submitted_date,
        statusLabel: bill.status_label,
        statusNote: bill.status_note,
        dietSessionName: dietSession?.name ?? null,
        normalTitle: content.title,
        normalSummary: content.summary,
        normalContent: content.content,
        tags: bill.bills_tags.flatMap((row) =>
          relationValues(row.tags).map((tag) => tag.label)
        ),
        sources: normalizeSources(bill.sources),
      };

      return [
        {
          id: bill.id,
          name: bill.name,
          publishStatus: bill.publish_status,
          currentSourceHash: createBillSeoSourceHash(source),
          faqCount: extractBillFaq(content.content).length,
          profile: profileRow ? mapBillSeoProfile(profileRow) : null,
        },
      ];
    }
  );
  const audited = auditManagedBillSeoEntries(inputs);
  const normalizedQuery = filters.query.normalize("NFKC").toLowerCase().trim();
  const filtered = audited.filter((entry) => {
    if (
      normalizedQuery &&
      ![
        entry.name,
        entry.profile?.seoTitle ?? "",
        entry.profile?.seoDescription ?? "",
        ...(entry.profile?.seoKeywords ?? []),
      ]
        .join(" ")
        .normalize("NFKC")
        .toLowerCase()
        .includes(normalizedQuery)
    ) {
      return false;
    }
    if (
      filters.status &&
      (filters.status === "missing"
        ? entry.profile !== null
        : entry.profile?.status !== filters.status)
    ) {
      return false;
    }
    return matchesIssueFilter(entry, filters.issue);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  return {
    entries: filtered.slice(offset, offset + PAGE_SIZE),
    total: filtered.length,
    totalPages,
    page,
    summary: {
      all: audited.length,
      ready: audited.filter((entry) => entry.profile?.status === "ready")
        .length,
      missing: audited.filter((entry) => !entry.profile).length,
      failed: audited.filter((entry) => entry.profile?.status === "failed")
        .length,
      withIssues: audited.filter((entry) => entry.issues.length > 0).length,
      todayCostUsd,
    },
  };
}

function matchesIssueFilter(
  entry: ManagedBillSeoAuditEntry,
  issue: AdminBillSeoAuditFilters["issue"]
) {
  if (!issue) return true;
  if (issue === "faq_missing") return entry.faqCount === 0;
  if (issue === "error" || issue === "warning") {
    return entry.issues.some((item) => item.severity === issue);
  }
  if (issue === "stale") {
    return entry.issues.some((item) => item.code === "stale");
  }
  return entry.issues.some((item) => item.code.startsWith("duplicate_"));
}

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function relationValues<T>(value: T | T[] | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeSources(value: unknown): BillSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((source) => {
    if (
      !source ||
      typeof source !== "object" ||
      !("title" in source) ||
      typeof source.title !== "string" ||
      !("source_type" in source) ||
      typeof source.source_type !== "string"
    ) {
      return [];
    }
    const item = source as Record<string, unknown>;
    return [
      {
        title: source.title,
        source_type: source.source_type,
        url: typeof item.url === "string" ? item.url : null,
        published_at:
          typeof item.published_at === "string" ? item.published_at : null,
        accessed_at:
          typeof item.accessed_at === "string" ? item.accessed_at : null,
      },
    ];
  });
}
