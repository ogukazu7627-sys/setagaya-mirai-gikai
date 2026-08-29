import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import { unstable_cache } from "next/cache";
import type { BillSource } from "@/features/bills/shared/types";
import {
  BILL_SEO_SITE_NAME,
  buildBillSeoMetadata,
} from "@/features/bills/shared/utils/bill-seo-metadata";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getSetagayaMockBillById,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import type { BillSeoProfile, BillSeoSourceData } from "../../shared/types";
import { createBillSeoSourceHash } from "../../shared/utils/bill-seo-source";
import {
  type BillFaqItem,
  extractBillFaq,
} from "../../shared/utils/extract-bill-faq";
import { mapBillSeoProfile } from "../repositories/bill-seo-repository";

export type PublishedBillSeoData = {
  billId: string;
  formalName: string;
  subjectTitle: string;
  title: string;
  description: string;
  keywords: string[];
  majorCategory: string | null;
  submittedDate: string | null;
  dietSessionName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  thumbnailUrl: string | null;
  shareThumbnailUrl: string | null;
  faqItems: BillFaqItem[];
  profile: BillSeoProfile | null;
};

type PublishedSeoRow = Pick<
  Database["public"]["Tables"]["bills"]["Row"],
  | "id"
  | "name"
  | "item_type"
  | "major_category"
  | "submitted_date"
  | "status_label"
  | "status_note"
  | "sources"
  | "published_at"
  | "updated_at"
  | "thumbnail_url"
  | "share_thumbnail_url"
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

const getCachedPublishedBillSeoData = unstable_cache(
  async (billId: string): Promise<PublishedBillSeoData | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
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
          published_at,
          updated_at,
          thumbnail_url,
          share_thumbnail_url,
          diet_session:diet_sessions(name),
          bill_contents!inner(title, summary, content),
          bills_tags(tags(label)),
          bill_seo_profiles(*)
        `
      )
      .eq("id", billId)
      .eq("publish_status", "published")
      .eq("publication_category", "report")
      .eq("bill_contents.difficulty_level", "normal")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as unknown as PublishedSeoRow;
    const content = first(row.bill_contents);
    if (!content) return null;
    const session = first(row.diet_session);
    const profileRow = first(row.bill_seo_profiles);
    const profile = profileRow ? mapBillSeoProfile(profileRow) : null;
    const source: BillSeoSourceData = {
      billId: row.id,
      formalName: row.name,
      itemType: row.item_type,
      majorCategory: row.major_category,
      submittedDate: row.submitted_date,
      statusLabel: row.status_label,
      statusNote: row.status_note,
      dietSessionName: session?.name ?? null,
      normalTitle: content.title,
      normalSummary: content.summary,
      normalContent: content.content,
      tags: row.bills_tags.flatMap((relation) =>
        relationValues(relation.tags).map((tag) => tag.label)
      ),
      sources: normalizeSources(row.sources),
    };
    const sourceHash = createBillSeoSourceHash(source);
    const readyProfile =
      profile?.status === "ready" && profile.sourceHash === sourceHash
        ? profile
        : null;
    const fallback = buildBillSeoMetadata({
      name: row.name,
      bill_content: { title: content.title, summary: content.summary },
    });
    const subjectTitle = readyProfile?.seoTitle ?? fallback.subjectTitle;
    const title = subjectTitle.includes(BILL_SEO_SITE_NAME)
      ? subjectTitle
      : `${subjectTitle} | ${BILL_SEO_SITE_NAME}`;

    return {
      billId: row.id,
      formalName: row.name,
      subjectTitle,
      title,
      description: readyProfile?.seoDescription ?? fallback.description,
      keywords: readyProfile?.seoKeywords ?? source.tags,
      majorCategory: row.major_category,
      submittedDate: row.submitted_date,
      dietSessionName: session?.name ?? null,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      thumbnailUrl: row.thumbnail_url,
      shareThumbnailUrl: row.share_thumbnail_url,
      faqItems: extractBillFaq(content.content),
      profile,
    };
  },
  ["published-bill-seo-data"],
  { revalidate: 600, tags: [CACHE_TAGS.BILLS] }
);

export async function getPublishedBillSeoData(
  billId: string
): Promise<PublishedBillSeoData | null> {
  if (!isSetagayaMockMode) {
    return getCachedPublishedBillSeoData(billId);
  }

  const bill = getSetagayaMockBillById(billId, "normal");
  const content = bill?.bill_content;
  if (
    !bill ||
    !content ||
    bill.publish_status !== "published" ||
    bill.publication_category !== "report"
  ) {
    return null;
  }

  const fallback = buildBillSeoMetadata({
    name: bill.name,
    bill_content: { title: content.title, summary: content.summary },
  });
  const title = fallback.subjectTitle.includes(BILL_SEO_SITE_NAME)
    ? fallback.subjectTitle
    : `${fallback.subjectTitle} | ${BILL_SEO_SITE_NAME}`;

  return {
    billId: bill.id,
    formalName: bill.name,
    subjectTitle: fallback.subjectTitle,
    title,
    description: fallback.description,
    keywords: bill.tags.map((tag) => tag.label),
    majorCategory: bill.major_category ?? null,
    submittedDate: bill.submitted_date,
    dietSessionName: bill.diet_session?.name ?? null,
    publishedAt: bill.published_at,
    updatedAt: bill.updated_at,
    thumbnailUrl: bill.thumbnail_url,
    shareThumbnailUrl: bill.share_thumbnail_url,
    faqItems: extractBillFaq(content.content),
    profile: null,
  };
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
