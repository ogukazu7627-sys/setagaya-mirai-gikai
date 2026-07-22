import "server-only";

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { Route } from "next";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  appendAdminBillsReturnPath,
  normalizeAdminBillsReturnPath,
} from "@/features/admin/shared/admin-bill-return-path";
import type { BillPublishStatus } from "@/features/bills/shared/types";
import {
  findUnknownCouncilorNamesByBillId,
  syncCouncilorBillStatements,
} from "@/features/councilors/server/repositories/councilor-statement-repository";
import { ensureDefaultPetitionInterviewConfig } from "@/features/interview-config/server/services/ensure-default-petition-interview-config";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { requireAdmin } from "./auth";
import {
  parseBillFormDataOrRedirect,
  redirectToAdminBillFormError,
} from "./bill-admin-form";
import { ensurePreviewToken } from "./bill-admin-preview";
import type { AdminBillSaveInput } from "./bill-admin-schemas";
import {
  type AdminBillFormData,
  AdminBillSaveError,
  type AdminSupabaseClient,
  type SaveAdminBillInputOptions,
  type SaveAdminBillInputResult,
} from "./bill-admin-shared";
import { resolveTagIds } from "./bill-admin-tags";
import {
  isFormFile,
  nullableString,
  submittedDateToDbValue,
  toDateInputValue,
} from "./bill-admin-utils";
import {
  extractKnowledgeSourceFile,
  mergeKnowledgeSourceText,
} from "./utils/knowledge-source-file";

const THUMBNAIL_BUCKET = "bill-thumbnails";
const MAX_THUMBNAIL_FILE_SIZE = 5 * 1024 * 1024;
const THUMBNAIL_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const THUMBNAIL_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const bulkPublishStatusSchema = z.enum(["draft", "published"]);
const bulkBillIdsSchema = z
  .array(z.string().uuid())
  .min(1, "一斉編集する案件を選択してください。")
  .max(100, "一度に編集できる案件は100件までです。");

function adminBillsReturnPathFromFormData(formData: FormData) {
  return normalizeAdminBillsReturnPath(formData.get("return_path"));
}

function redirectToAdminBillsWithParams(
  returnPath: string,
  params: Record<string, string>
): never {
  const url = new URL(returnPath, "http://localhost");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  redirect(`${url.pathname}?${url.searchParams.toString()}` as Route);
}

function thumbnailFileFromFormData(formData: FormData): File | null {
  const file = formData.get("thumbnail_file");
  if (!isFormFile(file) || file.size === 0) return null;

  if (!THUMBNAIL_MIME_TYPES.has(file.type)) {
    throw new Error("サムネイルはJPEG、PNG、WebPの画像を選択してください。");
  }

  if (file.size > MAX_THUMBNAIL_FILE_SIZE) {
    throw new Error("サムネイルは5MB以下の画像を選択してください。");
  }

  return file;
}

async function ensureThumbnailBucket(supabase: AdminSupabaseClient) {
  const { error } = await supabase.storage.getBucket(THUMBNAIL_BUCKET);
  if (!error) return;

  const { error: createError } = await supabase.storage.createBucket(
    THUMBNAIL_BUCKET,
    {
      public: true,
      fileSizeLimit: MAX_THUMBNAIL_FILE_SIZE,
      allowedMimeTypes: Array.from(THUMBNAIL_MIME_TYPES),
    }
  );

  if (createError && !/already exists/i.test(createError.message)) {
    throw createError;
  }
}

async function uploadBillThumbnail(
  supabase: AdminSupabaseClient,
  billId: string,
  file: File
): Promise<string> {
  await ensureThumbnailBucket(supabase);

  const extension = THUMBNAIL_EXTENSION_BY_MIME_TYPE[file.type] ?? "jpg";
  const objectPath = `${billId}/${randomUUID()}.${extension}`;
  const body = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(objectPath, body, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`サムネイルのアップロードに失敗しました: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(THUMBNAIL_BUCKET)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

export async function saveAdminBillInput(
  input: AdminBillSaveInput,
  options: SaveAdminBillInputOptions = {}
): Promise<SaveAdminBillInputResult> {
  if (isSetagayaMockMode) {
    throw new AdminBillSaveError(
      "現在はローカルのモック表示中です。保存するにはSupabase接続を設定してください。",
      503,
      "mock_mode"
    );
  }

  const supabase = createAdminClient();
  const now = options.now ?? new Date().toISOString();
  const isPublishing = input.publish_status === "published";
  const mode = input.id ? "updated" : "created";
  let billId = input.id;
  let thumbnailUrl = input.thumbnail_url;

  if (options.requireExistingDraft && billId) {
    const { data: existingBill, error: existingBillError } = await supabase
      .from("bills")
      .select("id, publish_status")
      .eq("id", billId)
      .maybeSingle();

    if (existingBillError) {
      throw new AdminBillSaveError(
        `更新対象の確認に失敗しました: ${existingBillError.message}`,
        500,
        "bill_lookup_failed",
        billId
      );
    }

    if (!existingBill) {
      throw new AdminBillSaveError(
        "更新対象の案件が見つかりません。",
        404,
        "bill_not_found",
        billId
      );
    }

    if (existingBill.publish_status !== "draft") {
      throw new AdminBillSaveError(
        "AI下書き保存APIではdraft以外の案件は更新できません。",
        409,
        "non_draft_update_not_allowed",
        billId
      );
    }
  }

  if (billId && options.thumbnailFile) {
    try {
      thumbnailUrl = await uploadBillThumbnail(
        supabase,
        billId,
        options.thumbnailFile
      );
    } catch (error) {
      throw new AdminBillSaveError(
        error instanceof Error
          ? error.message
          : "サムネイルのアップロードに失敗しました。",
        500,
        "thumbnail_upload_failed",
        billId
      );
    }
  }

  const billPayload = {
    name: input.name,
    item_type: input.item_type,
    major_category: input.major_category,
    status: input.status,
    status_label: input.status_label,
    status_note: input.status_note,
    publish_status: input.publish_status,
    originating_house: "HR" as const,
    diet_session_id: input.diet_session_id,
    submitted_date: submittedDateToDbValue(input.submitted_date),
    published_at: isPublishing ? now : null,
    thumbnail_url: thumbnailUrl,
    share_thumbnail_url: input.share_thumbnail_url,
    sources: input.sources,
    knowledge_source: input.knowledge_source,
    use_knowledge_source_in_chat: true,
    is_review_completed: input.is_review_completed,
    is_featured: input.is_featured,
    interview_enabled: true,
    updated_at: now,
  };

  if (billId) {
    const updatePayload = { ...billPayload };
    if (!isPublishing) {
      updatePayload.published_at = null;
    }

    const { error } = await supabase
      .from("bills")
      .update(updatePayload)
      .eq("id", billId);

    if (error) {
      throw new AdminBillSaveError(
        error.message,
        500,
        "bill_update_failed",
        billId
      );
    }
  } else {
    const { data, error } = await supabase
      .from("bills")
      .insert(billPayload)
      .select("id")
      .single();

    if (error || !data) {
      throw new AdminBillSaveError(
        error?.message ?? "保存に失敗しました",
        500,
        "bill_insert_failed"
      );
    }

    billId = data.id;

    if (options.thumbnailFile) {
      try {
        thumbnailUrl = await uploadBillThumbnail(
          supabase,
          billId,
          options.thumbnailFile
        );
      } catch (error) {
        throw new AdminBillSaveError(
          error instanceof Error
            ? error.message
            : "サムネイルのアップロードに失敗しました。",
          500,
          "thumbnail_upload_failed",
          billId
        );
      }

      const { error: thumbnailUpdateError } = await supabase
        .from("bills")
        .update({ thumbnail_url: thumbnailUrl, updated_at: now })
        .eq("id", billId);

      if (thumbnailUpdateError) {
        throw new AdminBillSaveError(
          thumbnailUpdateError.message,
          500,
          "thumbnail_update_failed",
          billId
        );
      }
    }
  }

  const hardTitle = input.hard_title || input.normal_title;
  const hardSummary = input.hard_summary || input.normal_summary;
  const hardContent = input.hard_content || input.normal_content;

  const { error: contentsError } = await supabase.from("bill_contents").upsert(
    [
      {
        bill_id: billId,
        difficulty_level: "normal" as const,
        title: input.normal_title,
        summary: input.normal_summary,
        content: input.normal_content,
        updated_at: now,
      },
      {
        bill_id: billId,
        difficulty_level: "hard" as const,
        title: hardTitle,
        summary: hardSummary,
        content: hardContent,
        updated_at: now,
      },
    ],
    { onConflict: "bill_id,difficulty_level" }
  );

  if (contentsError) {
    throw new AdminBillSaveError(
      contentsError.message,
      500,
      "bill_contents_upsert_failed",
      billId
    );
  }

  try {
    await syncCouncilorBillStatements({
      supabase,
      billId,
      normalContent: input.normal_content,
      now,
    });
  } catch (error) {
    throw new AdminBillSaveError(
      error instanceof Error ? error.message : "議員発言の保存に失敗しました",
      500,
      "councilor_statement_sync_failed",
      billId
    );
  }

  let resolvedTagIds: string[];
  try {
    resolvedTagIds = await resolveTagIds(
      supabase,
      input.tag_ids,
      input.new_tags
    );
  } catch (error) {
    throw new AdminBillSaveError(
      error instanceof Error ? error.message : "タグの保存に失敗しました",
      400,
      "tag_resolution_failed",
      billId
    );
  }

  const { error: deleteTagsError } = await supabase
    .from("bills_tags")
    .delete()
    .eq("bill_id", billId);

  if (deleteTagsError) {
    throw new AdminBillSaveError(
      deleteTagsError.message,
      500,
      "bill_tags_delete_failed",
      billId
    );
  }

  if (resolvedTagIds.length > 0) {
    const { error: insertTagsError } = await supabase.from("bills_tags").insert(
      resolvedTagIds.map((tagId) => ({
        bill_id: billId,
        tag_id: tagId,
      }))
    );

    if (insertTagsError) {
      throw new AdminBillSaveError(
        insertTagsError.message,
        500,
        "bill_tags_insert_failed",
        billId
      );
    }
  }

  try {
    await ensureDefaultPetitionInterviewConfig({ supabase, billId, now });
  } catch (error) {
    throw new AdminBillSaveError(
      error instanceof Error
        ? error.message
        : "AIインタビュー設定の自動作成に失敗しました",
      500,
      "interview_config_sync_failed",
      billId
    );
  }

  const previewToken = await ensurePreviewToken(
    billId,
    options.previewCreatedBy ?? "admin"
  );
  const unknownCouncilorNames = await findUnknownCouncilorNamesByBillId(billId);

  revalidateTag(CACHE_TAGS.BILLS);
  revalidateTag(CACHE_TAGS.INTERVIEW_CONFIGS);
  revalidateTag(CACHE_TAGS.COUNCILOR_STATEMENTS);

  return {
    billId,
    mode,
    previewToken,
    unknownCouncilorNames,
  };
}

export async function saveAdminBill(formData: FormData) {
  await requireAdmin();

  const returnPath = adminBillsReturnPathFromFormData(formData);
  const parsed = parseBillFormDataOrRedirect(formData);
  const thumbnailFile = (() => {
    try {
      return thumbnailFileFromFormData(formData);
    } catch (error) {
      redirectToAdminBillFormError(
        parsed.id,
        error instanceof Error
          ? error.message
          : "サムネイル画像を確認してください。",
        returnPath
      );
    }
  })();
  const knowledgeSource = await (async () => {
    const file = formData.get("knowledge_source_file");
    if (!isFormFile(file) || file.size === 0) {
      return parsed.knowledge_source;
    }

    try {
      return mergeKnowledgeSourceText(
        parsed.knowledge_source,
        await extractKnowledgeSourceFile(file)
      );
    } catch (error) {
      redirectToAdminBillFormError(
        parsed.id,
        error instanceof Error
          ? error.message
          : "ナレッジソースファイルを読み取れませんでした。",
        returnPath
      );
    }
  })();

  let result: SaveAdminBillInputResult;
  try {
    result = await saveAdminBillInput(
      { ...parsed, knowledge_source: knowledgeSource },
      { thumbnailFile, previewCreatedBy: "admin" }
    );
  } catch (error) {
    const billId =
      error instanceof AdminBillSaveError
        ? (error.billId ?? parsed.id)
        : parsed.id;
    redirectToAdminBillFormError(
      billId,
      error instanceof Error ? error.message : "保存に失敗しました。",
      returnPath
    );
  }

  redirect(
    appendAdminBillsReturnPath(
      `/admin/bills/${result.billId}/edit?saved=1`,
      returnPath
    ) as Route
  );
}

export async function deleteAdminBill(formData: FormData) {
  await requireAdmin("/admin/bills");

  const returnPath = adminBillsReturnPathFromFormData(formData);
  const billIdResult = z
    .string()
    .uuid()
    .safeParse(nullableString(formData.get("id")));

  if (!billIdResult.success) {
    redirectToAdminBillsWithParams(returnPath, {
      error: "削除対象の案件を確認できませんでした。",
    });
  }

  if (isSetagayaMockMode) {
    redirectToAdminBillsWithParams(returnPath, {
      error:
        "現在はローカルのモック表示中です。削除するにはSupabase接続を設定してください。",
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .delete()
    .eq("id", billIdResult.data)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectToAdminBillsWithParams(returnPath, {
      error: `削除に失敗しました: ${error.message}`,
    });
  }

  if (!data) {
    redirectToAdminBillsWithParams(returnPath, {
      error: "削除対象の案件が見つかりませんでした。",
    });
  }

  revalidateTag(CACHE_TAGS.BILLS);
  redirectToAdminBillsWithParams(returnPath, { deleted: "1" });
}

export async function bulkUpdateAdminBillPublishStatus(formData: FormData) {
  await requireAdmin("/admin/bills");

  const returnPath = adminBillsReturnPathFromFormData(formData);
  const targetStatusResult = bulkPublishStatusSchema.safeParse(
    nullableString(formData.get("bulk_publish_status"))
  );
  if (!targetStatusResult.success) {
    redirectToAdminBillsWithParams(returnPath, {
      error: "一斉編集の公開状態を確認できませんでした。",
    });
  }

  const billIdsResult = bulkBillIdsSchema.safeParse(
    Array.from(new Set(formData.getAll("bulk_bill_ids"))).filter(
      (value): value is string => typeof value === "string"
    )
  );
  if (!billIdsResult.success) {
    redirectToAdminBillsWithParams(returnPath, {
      error:
        billIdsResult.error.issues[0]?.message ??
        "一斉編集する案件を選択してください。",
    });
  }

  if (isSetagayaMockMode) {
    redirectToAdminBillsWithParams(returnPath, {
      error:
        "現在はローカルのモック表示中です。一斉編集するにはSupabase接続を設定してください。",
    });
  }

  const targetStatus: BillPublishStatus = targetStatusResult.data;
  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .update({
      publish_status: targetStatus,
      published_at: targetStatus === "published" ? now : null,
      updated_at: now,
    })
    .in("id", billIdsResult.data)
    .select("id");

  if (error) {
    redirectToAdminBillsWithParams(returnPath, {
      error: `一斉編集に失敗しました: ${error.message}`,
    });
  }

  const updatedCount = data?.length ?? 0;
  if (updatedCount === 0) {
    redirectToAdminBillsWithParams(returnPath, {
      error: "一斉編集する案件が見つかりませんでした。",
    });
  }

  revalidateTag(CACHE_TAGS.BILLS);

  redirectToAdminBillsWithParams(returnPath, {
    bulk_updated: String(updatedCount),
    bulk_status: targetStatus,
  });
}

export function getInitialAdminBillValues(data: AdminBillFormData) {
  const normal = data.contents.normal;
  const hard = data.contents.hard;
  return {
    submittedDate: toDateInputValue(data.bill?.submitted_date ?? null),
    normalTitle: normal?.title ?? "",
    normalSummary: normal?.summary ?? "",
    normalContent: normal?.content ?? "",
    hardTitle: hard?.title ?? "",
    hardSummary: hard?.summary ?? "",
    hardContent: hard?.content ?? "",
  };
}
