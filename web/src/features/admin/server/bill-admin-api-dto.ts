import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { z } from "zod";
import type { BillItemType } from "@/features/bills/shared/types";
import { findUnknownCouncilorNamesByBillId } from "@/features/councilors/server/repositories/councilor-statement-repository";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { ensurePreviewToken } from "./bill-admin-preview";
import { saveAdminBillInput } from "./bill-admin-save";
import {
  type AdminBillSaveInput,
  adminDraftBillApiSchema,
  billFormSchema,
} from "./bill-admin-schemas";
import {
  type AdminBillKnowledgeSourceExportItem,
  AdminBillSaveError,
  type AdminDraftBillApiTag,
  type BillRow,
  type BillTagJoinRow,
  billItemTypeSchema,
  type DietSessionRow,
  type GetAdminDraftBillApiResponse,
  type ListAdminBillKnowledgeSourcesApiResponse,
  type SaveAdminDraftBillApiResponse,
} from "./bill-admin-shared";
import {
  getFirstZodIssueMessage,
  isMajorCategoryLabel,
  normalizeBillSourcesForApi,
  normalizeJoinedTag,
  selectBillContent,
  toDateInputValue,
} from "./bill-admin-utils";

function assertDraftApiStateIsSafe(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const value = input as Record<string, unknown>;

  if (
    "publish_status" in value &&
    value.publish_status !== undefined &&
    value.publish_status !== "draft"
  ) {
    throw new AdminBillSaveError(
      "AI下書き保存APIではpublish_statusはdraftのみ指定できます。",
      400,
      "publish_status_not_allowed"
    );
  }

  if (value.is_review_completed === true) {
    throw new AdminBillSaveError(
      "AI下書き保存APIではレビュー完了にはできません。",
      400,
      "review_completed_not_allowed"
    );
  }
}

function parseAdminDraftBillApiInput(input: unknown): AdminBillSaveInput {
  assertDraftApiStateIsSafe(input);
  const result = adminDraftBillApiSchema.safeParse(input);

  if (!result.success) {
    throw new AdminBillSaveError(
      getFirstZodIssueMessage(result.error),
      400,
      "invalid_request"
    );
  }

  const formResult = billFormSchema.safeParse(result.data);
  if (!formResult.success) {
    throw new AdminBillSaveError(
      getFirstZodIssueMessage(formResult.error),
      400,
      "invalid_request"
    );
  }

  return formResult.data;
}

export async function saveAdminDraftBillFromJson(
  input: unknown
): Promise<SaveAdminDraftBillApiResponse> {
  const parsed = parseAdminDraftBillApiInput(input);
  const result = await saveAdminBillInput(parsed, {
    requireExistingDraft: true,
    previewCreatedBy: "admin-api",
  });

  return {
    success: true,
    mode: result.mode,
    billId: result.billId,
    adminEditUrl: new URL(
      routes.adminBillEdit(result.billId),
      env.webUrl
    ).toString(),
    previewUrl: new URL(
      routes.previewBillDetail(result.billId, result.previewToken),
      env.webUrl
    ).toString(),
    unknownCouncilorNames: result.unknownCouncilorNames,
    forcedFields: {
      publish_status: "draft",
      is_review_completed: false,
      interview_enabled: true,
    },
  };
}

export async function getAdminDraftBillForApi(
  billId: string
): Promise<GetAdminDraftBillApiResponse> {
  const billIdResult = z.string().uuid().safeParse(billId);
  if (!billIdResult.success) {
    throw new AdminBillSaveError(
      "idはUUID形式で指定してください。",
      400,
      "invalid_id",
      billId
    );
  }

  if (isSetagayaMockMode) {
    throw new AdminBillSaveError(
      "現在はローカルのモック表示中です。読み取るにはSupabase接続を設定してください。",
      503,
      "mock_mode",
      billId
    );
  }

  const supabase = createAdminClient();
  const [billResult, contentsResult, billTagsResult, unknownCouncilorNames] =
    await Promise.all([
      supabase
        .from("bills")
        .select("*")
        .eq("id", billIdResult.data)
        .maybeSingle(),
      supabase
        .from("bill_contents")
        .select("*")
        .eq("bill_id", billIdResult.data),
      supabase
        .from("bills_tags")
        .select("tag_id, tags(id, label, major_category)")
        .eq("bill_id", billIdResult.data),
      findUnknownCouncilorNamesByBillId(billIdResult.data),
    ]);

  if (billResult.error) {
    throw new AdminBillSaveError(
      `読み取り対象の確認に失敗しました: ${billResult.error.message}`,
      500,
      "bill_lookup_failed",
      billId
    );
  }

  if (!billResult.data) {
    throw new AdminBillSaveError(
      "読み取り対象の案件が見つかりません。",
      404,
      "bill_not_found",
      billId
    );
  }

  if (billResult.data.publish_status !== "draft") {
    throw new AdminBillSaveError(
      "AI下書き読み取りAPIではdraft以外の案件は読み取れません。",
      409,
      "non_draft_read_not_allowed",
      billId
    );
  }

  if (contentsResult.error) {
    throw new AdminBillSaveError(
      `本文の読み取りに失敗しました: ${contentsResult.error.message}`,
      500,
      "bill_contents_lookup_failed",
      billId
    );
  }

  if (billTagsResult.error) {
    throw new AdminBillSaveError(
      `タグの読み取りに失敗しました: ${billTagsResult.error.message}`,
      500,
      "bill_tags_lookup_failed",
      billId
    );
  }

  const bill = billResult.data;
  const normalContent = selectBillContent(contentsResult.data, "normal");
  const hardContent = selectBillContent(contentsResult.data, "hard");
  const tagRows = (billTagsResult.data ?? []) as BillTagJoinRow[];
  const tags = tagRows
    .map((row) => normalizeJoinedTag(row.tags))
    .filter((tag): tag is AdminDraftBillApiTag => Boolean(tag));
  const previewToken = await ensurePreviewToken(bill.id, "admin-api");
  const majorCategory = isMajorCategoryLabel(bill.major_category)
    ? bill.major_category
    : "教育🏫";

  return {
    success: true,
    billId: bill.id,
    adminEditUrl: new URL(routes.adminBillEdit(bill.id), env.webUrl).toString(),
    previewUrl: new URL(
      routes.previewBillDetail(bill.id, previewToken),
      env.webUrl
    ).toString(),
    draft: {
      id: bill.id,
      name: bill.name,
      item_type: bill.item_type,
      major_category: majorCategory,
      diet_session_id: bill.diet_session_id,
      submitted_date: toDateInputValue(bill.submitted_date) || null,
      status: bill.status,
      status_label: bill.status_label,
      status_note: bill.status_note,
      publish_status: "draft",
      is_review_completed: false,
      is_featured: bill.is_featured,
      interview_enabled: true,
      use_knowledge_source_in_chat: bill.use_knowledge_source_in_chat,
      thumbnail_url: bill.thumbnail_url,
      share_thumbnail_url: bill.share_thumbnail_url,
      normal_title: normalContent?.title ?? bill.name,
      normal_summary: normalContent?.summary ?? "",
      normal_content: normalContent?.content ?? "",
      hard_title: hardContent?.title ?? null,
      hard_summary: hardContent?.summary ?? null,
      hard_content: hardContent?.content ?? null,
      tag_ids: tagRows.map((row) => row.tag_id),
      tag_labels: tags.map((tag) => tag.label),
      tags,
      sources: normalizeBillSourcesForApi(bill.sources),
      knowledge_source: bill.knowledge_source,
    },
    unknownCouncilorNames,
    forcedFields: {
      publish_status: "draft",
      is_review_completed: false,
      interview_enabled: true,
    },
  };
}

type AdminBillKnowledgeSourceExportRow = Pick<
  BillRow,
  | "id"
  | "name"
  | "item_type"
  | "publish_status"
  | "submitted_date"
  | "major_category"
  | "status"
  | "status_label"
  | "status_note"
  | "knowledge_source"
  | "use_knowledge_source_in_chat"
  | "sources"
  | "updated_at"
  | "diet_session_id"
> & {
  diet_sessions:
    | Pick<DietSessionRow, "id" | "name" | "slug" | "start_date" | "end_date">
    | Array<
        Pick<DietSessionRow, "id" | "name" | "slug" | "start_date" | "end_date">
      >
    | null;
};

function normalizeJoinedDietSession(
  session: AdminBillKnowledgeSourceExportRow["diet_sessions"]
): AdminBillKnowledgeSourceExportItem["diet_session"] {
  if (!session) {
    return null;
  }
  return Array.isArray(session) ? (session[0] ?? null) : session;
}

function normalizeKnowledgeSourceExportRow(
  row: AdminBillKnowledgeSourceExportRow
): AdminBillKnowledgeSourceExportItem {
  return {
    id: row.id,
    name: row.name,
    item_type: row.item_type as BillItemType,
    publish_status: row.publish_status,
    submitted_date: toDateInputValue(row.submitted_date) || null,
    major_category: row.major_category,
    status: row.status,
    status_label: row.status_label,
    status_note: row.status_note,
    knowledge_source: row.knowledge_source,
    use_knowledge_source_in_chat: row.use_knowledge_source_in_chat,
    sources: normalizeBillSourcesForApi(row.sources),
    updated_at: row.updated_at,
    diet_session_id: row.diet_session_id,
    diet_session: normalizeJoinedDietSession(row.diet_sessions),
  };
}

export async function listAdminBillKnowledgeSourcesForApi(
  itemTypeInput: string | null = "report"
): Promise<ListAdminBillKnowledgeSourcesApiResponse> {
  const itemTypeResult = billItemTypeSchema.safeParse(
    itemTypeInput ?? "report"
  );
  if (!itemTypeResult.success) {
    throw new AdminBillSaveError(
      "item_typeはbill, report, petition, questionのいずれかを指定してください。",
      400,
      "invalid_item_type"
    );
  }

  if (isSetagayaMockMode) {
    throw new AdminBillSaveError(
      "現在はローカルのモック表示中です。読み取るにはSupabase接続を設定してください。",
      503,
      "mock_mode"
    );
  }

  const supabase = createAdminClient();
  const pageSize = 1000;
  let from = 0;
  let totalCount: number | null = null;
  const rows: AdminBillKnowledgeSourceExportRow[] = [];

  while (totalCount === null || rows.length < totalCount) {
    const { data, error, count } = await supabase
      .from("bills")
      .select(
        `
        id,
        name,
        item_type,
        publish_status,
        submitted_date,
        major_category,
        status,
        status_label,
        status_note,
        knowledge_source,
        use_knowledge_source_in_chat,
        sources,
        updated_at,
        diet_session_id,
        diet_sessions(id, name, slug, start_date, end_date)
      `,
        { count: "exact" }
      )
      .eq("item_type", itemTypeResult.data)
      .order("submitted_date", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new AdminBillSaveError(
        `ナレッジソース一覧の読み取りに失敗しました: ${error.message}`,
        500,
        "knowledge_sources_lookup_failed"
      );
    }

    totalCount = count ?? rows.length + (data?.length ?? 0);
    rows.push(...((data ?? []) as AdminBillKnowledgeSourceExportRow[]));

    if (!data || data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return {
    success: true,
    item_type: itemTypeResult.data,
    count: totalCount ?? rows.length,
    records: rows.map(normalizeKnowledgeSourceExportRow),
  };
}
