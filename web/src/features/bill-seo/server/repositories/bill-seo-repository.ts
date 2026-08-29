import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import type { BillSource } from "@/features/bills/shared/types";
import type {
  BillSeoGenerationStatus,
  BillSeoProfile,
  BillSeoSourceData,
} from "../../shared/types";

type AdminClient = ReturnType<typeof createAdminClient>;
type SeoProfileRow = Database["public"]["Tables"]["bill_seo_profiles"]["Row"];

type BillSeoSourceBillRow = Pick<
  Database["public"]["Tables"]["bills"]["Row"],
  | "id"
  | "name"
  | "item_type"
  | "major_category"
  | "submitted_date"
  | "status_label"
  | "status_note"
  | "sources"
  | "publication_category"
> & {
  diet_session: { name: string } | Array<{ name: string }> | null;
};

type TagRelationRow = {
  tags: { label: string } | Array<{ label: string }> | null;
};

export async function findBillSeoSource(
  billId: string,
  supabase: AdminClient = createAdminClient()
): Promise<{ source: BillSeoSourceData | null; isReport: boolean }> {
  const [billResult, contentResult, tagsResult] = await Promise.all([
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
          publication_category,
          diet_session:diet_sessions(name)
        `
      )
      .eq("id", billId)
      .maybeSingle(),
    supabase
      .from("bill_contents")
      .select("title, summary, content")
      .eq("bill_id", billId)
      .eq("difficulty_level", "normal")
      .maybeSingle(),
    supabase.from("bills_tags").select("tags(label)").eq("bill_id", billId),
  ]);

  const firstError =
    billResult.error ?? contentResult.error ?? tagsResult.error;
  if (firstError) {
    throw new Error(`SEO生成元の読み取りに失敗しました: ${firstError.message}`);
  }

  const bill = billResult.data as unknown as BillSeoSourceBillRow | null;
  if (!bill) {
    throw new Error("SEO生成対象の案件が見つかりません。");
  }

  if (bill.publication_category !== "report") {
    return { source: null, isReport: false };
  }

  const content = contentResult.data;
  if (!content) {
    return { source: null, isReport: true };
  }

  const dietSession = Array.isArray(bill.diet_session)
    ? bill.diet_session[0]
    : bill.diet_session;

  return {
    isReport: true,
    source: {
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
      tags: ((tagsResult.data ?? []) as unknown as TagRelationRow[])
        .flatMap((row) => normalizeTagRelation(row.tags))
        .sort((left, right) => left.localeCompare(right, "ja")),
      sources: normalizeSources(bill.sources),
    },
  };
}

export async function findBillSeoProfile(
  billId: string,
  supabase: AdminClient = createAdminClient()
): Promise<BillSeoProfile | null> {
  const { data, error } = await supabase
    .from("bill_seo_profiles")
    .select("*")
    .eq("bill_id", billId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `SEOプロフィールの読み取りに失敗しました: ${error.message}`
    );
  }

  return data ? mapBillSeoProfile(data) : null;
}

export async function findReadyBillSeoKeywordsByBillIds(
  billIds: string[],
  supabase: AdminClient = createAdminClient()
): Promise<Map<string, string[]>> {
  if (billIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("bill_seo_profiles")
    .select("bill_id, seo_keywords")
    .in("bill_id", billIds)
    .eq("status", "ready");

  if (error) {
    throw new Error(`SEOキーワードの読み取りに失敗しました: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((row) => [row.bill_id, row.seo_keywords] as const)
  );
}

export async function claimBillSeoGeneration(
  input: { billId: string; sourceHash: string; force: boolean },
  supabase: AdminClient = createAdminClient()
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_bill_seo_generation", {
    p_bill_id: input.billId,
    p_source_hash: input.sourceHash,
    p_force: input.force,
  });

  if (error) {
    throw new Error(`SEO生成ロックの取得に失敗しました: ${error.message}`);
  }

  return data === true;
}

export async function completeBillSeoGeneration(
  input: {
    billId: string;
    sourceHash: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    model: string;
    generatedAt: string;
  },
  supabase: AdminClient = createAdminClient()
): Promise<BillSeoProfile | null> {
  const { data, error } = await supabase
    .from("bill_seo_profiles")
    .update({
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      seo_keywords: input.seoKeywords,
      status: "ready",
      generated_at: input.generatedAt,
      generation_started_at: null,
      model: input.model,
      last_error: null,
    })
    .eq("bill_id", input.billId)
    .eq("source_hash", input.sourceHash)
    .eq("status", "generating")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`SEOプロフィールの保存に失敗しました: ${error.message}`);
  }

  return data ? mapBillSeoProfile(data) : null;
}

export async function failBillSeoGeneration(
  input: {
    billId: string;
    sourceHash: string;
    errorMessage: string;
    onlyIfGenerating?: boolean;
  },
  supabase: AdminClient = createAdminClient()
): Promise<void> {
  const payload = {
    bill_id: input.billId,
    source_hash: input.sourceHash,
    status: "failed",
    generation_started_at: null,
    last_error: input.errorMessage.slice(0, 1000),
  };
  const operation = input.onlyIfGenerating
    ? supabase
        .from("bill_seo_profiles")
        .update(payload)
        .eq("bill_id", input.billId)
        .eq("source_hash", input.sourceHash)
        .eq("status", "generating")
    : supabase
        .from("bill_seo_profiles")
        .upsert(payload, { onConflict: "bill_id" });
  const { error } = await operation;

  if (error) {
    throw new Error(`SEO生成失敗状態の保存に失敗しました: ${error.message}`);
  }
}

export async function recordBillSeoGenerationEvent(
  input: {
    billId: string;
    sourceHash: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    success: boolean;
    errorMessage: string | null;
  },
  supabase: AdminClient = createAdminClient()
): Promise<void> {
  const { error } = await supabase.from("bill_seo_generation_events").insert({
    bill_id: input.billId,
    source_hash: input.sourceHash,
    model: input.model,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    total_tokens: input.totalTokens,
    cost_usd: input.costUsd,
    success: input.success,
    error_message: input.errorMessage,
  });

  if (error) {
    throw new Error(`SEO生成履歴の保存に失敗しました: ${error.message}`);
  }
}

export async function sumBillSeoGenerationCostSince(
  since: string,
  supabase: AdminClient = createAdminClient()
): Promise<number> {
  const { data, error } = await supabase
    .from("bill_seo_generation_events")
    .select("cost_usd")
    .gte("created_at", since);

  if (error) {
    throw new Error(`SEO生成コストの確認に失敗しました: ${error.message}`);
  }

  return (data ?? []).reduce(
    (total, row) => total + (Number(row.cost_usd) || 0),
    0
  );
}

export function mapBillSeoProfile(row: SeoProfileRow): BillSeoProfile {
  return {
    billId: row.bill_id,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoKeywords: row.seo_keywords,
    status: row.status as BillSeoGenerationStatus,
    sourceHash: row.source_hash,
    generatedAt: row.generated_at,
    generationStartedAt: row.generation_started_at,
    model: row.model,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

function normalizeTagRelation(relation: TagRelationRow["tags"]): string[] {
  if (!relation) {
    return [];
  }
  return (Array.isArray(relation) ? relation : [relation])
    .map((tag) => tag.label.trim())
    .filter(Boolean);
}

function normalizeSources(value: unknown): BillSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

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
        title: source.title.trim(),
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
