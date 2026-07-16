import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { findUnknownCouncilorNamesByBillId } from "@/features/councilors/server/repositories/councilor-statement-repository";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { requireAdmin } from "./auth";
import { mockFormData } from "./bill-admin-mock";
import { ensurePreviewToken } from "./bill-admin-preview";
import type { AdminBillFormData } from "./bill-admin-shared";

export async function getAdminBillFormData(
  billId?: string
): Promise<AdminBillFormData> {
  await requireAdmin(
    billId ? `/admin/bills/${billId}/edit` : "/admin/bills/new"
  );
  if (isSetagayaMockMode) {
    return mockFormData(billId);
  }

  const supabase = createAdminClient();

  const [tagsResult, sessionsResult] = await Promise.all([
    supabase.from("tags").select("*").order("label", { ascending: true }),
    supabase
      .from("diet_sessions")
      .select("*")
      .order("start_date", { ascending: false }),
  ]);

  if (tagsResult.error) {
    throw new Error(`Failed to fetch tags: ${tagsResult.error.message}`);
  }
  if (sessionsResult.error) {
    throw new Error(
      `Failed to fetch sessions: ${sessionsResult.error.message}`
    );
  }

  if (!billId) {
    return {
      bill: null,
      contents: { normal: null, hard: null },
      selectedTagIds: [],
      previewToken: null,
      tags: tagsResult.data ?? [],
      sessions: sessionsResult.data ?? [],
      unknownCouncilorNames: [],
    };
  }

  const [
    billResult,
    contentsResult,
    billTagsResult,
    token,
    unknownCouncilorNames,
  ] = await Promise.all([
    supabase.from("bills").select("*").eq("id", billId).single(),
    supabase.from("bill_contents").select("*").eq("bill_id", billId),
    supabase.from("bills_tags").select("tag_id").eq("bill_id", billId),
    ensurePreviewToken(billId),
    findUnknownCouncilorNamesByBillId(billId),
  ]);

  if (billResult.error) {
    throw new Error(`Failed to fetch bill: ${billResult.error.message}`);
  }
  if (contentsResult.error) {
    throw new Error(
      `Failed to fetch bill contents: ${contentsResult.error.message}`
    );
  }
  if (billTagsResult.error) {
    throw new Error(
      `Failed to fetch bill tags: ${billTagsResult.error.message}`
    );
  }

  return {
    bill: billResult.data,
    contents: {
      normal:
        contentsResult.data?.find(
          (content) => content.difficulty_level === "normal"
        ) ?? null,
      hard:
        contentsResult.data?.find(
          (content) => content.difficulty_level === "hard"
        ) ?? null,
    },
    selectedTagIds: billTagsResult.data?.map((row) => row.tag_id) ?? [],
    previewToken: token,
    tags: tagsResult.data ?? [],
    sessions: sessionsResult.data ?? [],
    unknownCouncilorNames,
  };
}
