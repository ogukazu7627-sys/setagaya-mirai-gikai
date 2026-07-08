import "server-only";

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { Database } from "@mirai-gikai/supabase";
import { createAdminClient } from "@mirai-gikai/supabase";
import { nanoid } from "nanoid";
import type { Route } from "next";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type {
  BillItemType,
  BillPublishStatus,
  BillSource,
  BillStatusEnum,
  BillWithContent,
  MajorCategoryLabel,
} from "@/features/bills/shared/types";
import { MAJOR_CATEGORY_OPTIONS } from "@/features/bills/shared/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { routes } from "@/lib/routes";
import {
  getSetagayaMockBillById,
  getSetagayaMockBills,
  getSetagayaMockSession,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import { requireAdmin } from "./auth";
import {
  extractKnowledgeSourceFile,
  mergeKnowledgeSourceText,
} from "./utils/knowledge-source-file";

type BillRow = Database["public"]["Tables"]["bills"]["Row"];
type BillContentRow = Database["public"]["Tables"]["bill_contents"]["Row"];
type DietSessionRow = Database["public"]["Tables"]["diet_sessions"]["Row"];
type TagRow = Database["public"]["Tables"]["tags"]["Row"];
type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

const THUMBNAIL_BUCKET = "bill-thumbnails";
const MAX_THUMBNAIL_FILE_SIZE = 5 * 1024 * 1024;
const THUMBNAIL_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const THUMBNAIL_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const BILL_ITEM_TYPE_OPTIONS: Array<{
  value: BillItemType;
  label: string;
}> = [
  { value: "bill", label: "議案" },
  { value: "report", label: "報告事項" },
  { value: "petition", label: "請願・陳情" },
  { value: "question", label: "質問" },
];

export const BILL_STATUS_OPTIONS: Array<{
  value: BillStatusEnum;
  label: string;
}> = [
  { value: "preparing", label: "準備中" },
  { value: "introduced", label: "提出" },
  { value: "in_originating_house", label: "委員会" },
  { value: "in_receiving_house", label: "議会" },
  { value: "enacted", label: "完了: 可決・採択・報告済み" },
  { value: "rejected", label: "完了: 否決・不採択" },
];

export const BILL_STATUS_LABEL_OPTIONS = [
  "提出",
  "委員会で審査中",
  "委員会で報告",
  "付託",
  "本会議で質問・答弁済み",
  "質問・答弁済み",
  "可決",
  "否決",
  "採択",
  "趣旨採択",
  "不採択",
  "継続審議",
  "報告済み",
  "完了",
] as const;

export const PUBLISH_STATUS_OPTIONS: Array<{
  value: BillPublishStatus;
  label: string;
}> = [
  { value: "draft", label: "下書き" },
  { value: "published", label: "公開" },
];

export const SOURCE_TYPE_OPTIONS = [
  "bill_pdf",
  "committee_agenda",
  "session_result",
  "vote_result",
  "petition_result",
  "question_summary",
  "official_page",
] as const;

export type AdminBillListItem = BillRow & {
  bill_contents?: Pick<
    BillContentRow,
    "title" | "summary" | "difficulty_level"
  >[];
  bills_tags?: {
    tags: { id: string; label: string; major_category?: string | null } | null;
  }[];
};

export type AdminBillFormData = {
  bill: BillRow | null;
  contents: {
    normal: Partial<BillContentRow> | null;
    hard: Partial<BillContentRow> | null;
  };
  selectedTagIds: string[];
  previewToken: string | null;
  tags: TagRow[];
  sessions: DietSessionRow[];
};

const majorCategoryLabels = MAJOR_CATEGORY_OPTIONS.map(
  (category) => category.label
) as [MajorCategoryLabel, ...MajorCategoryLabel[]];

type NewTagInput = {
  label: string;
  major_category: MajorCategoryLabel;
};

const billFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "正式タイトルは必須です"),
    item_type: z.enum(["bill", "report", "petition", "question"]),
    major_category: z.enum(majorCategoryLabels),
    status: z.enum([
      "preparing",
      "introduced",
      "in_originating_house",
      "in_receiving_house",
      "enacted",
      "rejected",
    ]),
    publish_status: z.enum(["draft", "published"]),
    diet_session_id: z.string().uuid().nullable(),
    submitted_date: z.string().nullable(),
    status_label: z.string().trim().nullable(),
    status_note: z.string().trim().nullable(),
    thumbnail_url: z.string().trim().nullable(),
    share_thumbnail_url: z.string().trim().nullable(),
    knowledge_source: z.string().trim().nullable(),
    is_review_completed: z.boolean(),
    is_featured: z.boolean(),
    interview_enabled: z.boolean(),
    use_knowledge_source_in_chat: z.boolean(),
    normal_title: z.string().trim().min(1, "normalの表示タイトルは必須です"),
    normal_summary: z.string().trim().min(1, "normalの概要は必須です"),
    normal_content: z.string().trim().min(1, "normalの本文は必須です"),
    hard_title: z.string().trim().nullable(),
    hard_summary: z.string().trim().nullable(),
    hard_content: z.string().trim().nullable(),
    tag_ids: z.array(z.string().uuid()).max(3, "タグは最大3つまでです"),
    new_tags: z.array(
      z.object({
        label: z.string().trim().min(1),
        major_category: z.enum(majorCategoryLabels),
      })
    ),
    sources: z.array(
      z.object({
        title: z.string().trim().min(1),
        url: z.string().trim().nullable(),
        source_type: z.string().trim().min(1),
        published_at: z.string().trim().nullable(),
        accessed_at: z.string().trim().nullable(),
      })
    ),
  })
  .superRefine((value, ctx) => {
    if (value.tag_ids.length + value.new_tags.length > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tag_ids"],
        message: "タグは最大3つまでです",
      });
    }
  });

function nullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isFormFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    "type" in value
  );
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

function redirectToAdminBillFormError(
  billId: string | undefined,
  message: string
): never {
  const target = billId ? `/admin/bills/${billId}/edit` : "/admin/bills/new";
  redirect(`${target}?error=${encodeURIComponent(message)}` as Route);
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

function dateToTimestamp(value: string | null): string | null {
  if (!value) return null;
  return `${value}T00:00:00+09:00`;
}

function sourcesFromFormData(formData: FormData): BillSource[] {
  const sources: BillSource[] = [];

  for (let index = 0; index < 8; index++) {
    const title = nullableString(formData.get(`source_${index}_title`));
    if (!title) continue;
    sources.push({
      title,
      url: nullableString(formData.get(`source_${index}_url`)),
      source_type:
        nullableString(formData.get(`source_${index}_source_type`)) ??
        "official_page",
      published_at: nullableString(
        formData.get(`source_${index}_published_at`)
      ),
      accessed_at: nullableString(formData.get(`source_${index}_accessed_at`)),
    });
  }

  return sources;
}

function newTagsFromFormData(formData: FormData): NewTagInput[] {
  const fallbackCategory =
    nullableString(formData.get("new_tag_major_category")) ?? "教育🏫";
  const labels = formData.getAll("new_tag_labels");
  const categories = formData.getAll("new_tag_major_categories");
  const seenLabels = new Set<string>();
  const tags: NewTagInput[] = [];

  labels.forEach((entry, index) => {
    if (typeof entry !== "string") return;
    const label = entry.trim();
    if (!label || seenLabels.has(label)) return;

    const categoryEntry = categories[index];
    const majorCategory =
      typeof categoryEntry === "string" && categoryEntry.trim()
        ? categoryEntry.trim()
        : fallbackCategory;

    seenLabels.add(label);
    tags.push({
      label,
      major_category: majorCategory as MajorCategoryLabel,
    });
  });

  return tags;
}

function parseBillFormData(formData: FormData) {
  const id = nullableString(formData.get("id")) ?? undefined;
  return billFormSchema.parse({
    id,
    name: formData.get("name"),
    item_type: formData.get("item_type"),
    major_category: formData.get("major_category"),
    status: formData.get("status"),
    publish_status: formData.get("publish_status"),
    diet_session_id: nullableString(formData.get("diet_session_id")),
    submitted_date: nullableString(formData.get("submitted_date")),
    status_label: nullableString(formData.get("status_label")),
    status_note: nullableString(formData.get("status_note")),
    thumbnail_url: nullableString(formData.get("thumbnail_url")),
    share_thumbnail_url: nullableString(formData.get("share_thumbnail_url")),
    knowledge_source: nullableString(formData.get("knowledge_source")),
    is_review_completed: formData.get("is_review_completed") === "on",
    is_featured: formData.get("is_featured") === "on",
    interview_enabled: formData.get("interview_enabled") === "on",
    use_knowledge_source_in_chat:
      formData.get("use_knowledge_source_in_chat") === "on",
    normal_title: formData.get("normal_title"),
    normal_summary: formData.get("normal_summary"),
    normal_content: formData.get("normal_content"),
    hard_title: nullableString(formData.get("hard_title")),
    hard_summary: nullableString(formData.get("hard_summary")),
    hard_content: nullableString(formData.get("hard_content")),
    tag_ids: formData.getAll("tag_ids"),
    new_tags: newTagsFromFormData(formData),
    sources: sourcesFromFormData(formData),
  });
}

function parseBillFormDataOrRedirect(formData: FormData) {
  try {
    return parseBillFormData(formData);
  } catch (error) {
    const id = nullableString(formData.get("id"));
    const target = id ? `/admin/bills/${id}/edit` : "/admin/bills/new";
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "入力内容を確認してください")
        : "入力内容を確認してください";
    redirect(`${target}?error=${encodeURIComponent(message)}` as Route);
  }
}

function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function formatAdminDate(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

function mockTags(): TagRow[] {
  const now = new Date().toISOString();
  const tagsById = new Map<string, TagRow>();

  for (const bill of getSetagayaMockBills()) {
    for (const tag of bill.tags) {
      tagsById.set(tag.id, {
        id: tag.id,
        label: tag.label,
        major_category: bill.major_category ?? "教育🏫",
        description: null,
        featured_priority: null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return Array.from(tagsById.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ja")
  );
}

function mockSession(): DietSessionRow {
  return getSetagayaMockSession() as DietSessionRow;
}

function mockBillToRow(bill: BillWithContent): BillRow {
  return {
    ...bill,
    interview_enabled: bill.interview_enabled ?? false,
    is_review_completed: bill.is_review_completed ?? true,
    major_category: bill.major_category ?? null,
    published_at: bill.published_at ?? null,
    publish_status_order: bill.publish_status_order ?? null,
    slug: bill.slug ?? null,
    sources: (bill.sources ?? []) as BillRow["sources"],
    status_order: bill.status_order ?? null,
  } as BillRow;
}

function mockBillToAdminListItem(bill: BillWithContent): AdminBillListItem {
  return {
    ...mockBillToRow(bill),
    bill_contents: bill.bill_content
      ? [
          {
            title: bill.bill_content.title,
            summary: bill.bill_content.summary,
            difficulty_level: bill.bill_content.difficulty_level,
          },
        ]
      : [],
    bills_tags: bill.tags.map((tag) => ({ tags: tag })),
  };
}

function mockFormData(billId?: string): AdminBillFormData {
  const bill = billId ? getSetagayaMockBillById(billId, "normal") : null;
  const hardBill = billId ? getSetagayaMockBillById(billId, "hard") : null;

  if (billId && !bill) {
    throw new Error("指定された案件が見つかりません。");
  }

  return {
    bill: bill ? mockBillToRow(bill) : null,
    contents: {
      normal: bill?.bill_content ?? null,
      hard: hardBill?.bill_content ?? null,
    },
    selectedTagIds: bill?.tags.map((tag) => tag.id) ?? [],
    previewToken: bill ? "mock-preview-token" : null,
    tags: mockTags(),
    sessions: [mockSession()],
  };
}

export async function listAdminBills(): Promise<AdminBillListItem[]> {
  await requireAdmin("/admin/bills");
  if (isSetagayaMockMode) {
    return getSetagayaMockBills().map(mockBillToAdminListItem);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents(title, summary, difficulty_level),
      bills_tags(tags(id, label, major_category))
    `
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch admin bills: ${error.message}`);
  }

  return (data ?? []) as AdminBillListItem[];
}

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
    };
  }

  const [billResult, contentsResult, billTagsResult, token] = await Promise.all(
    [
      supabase.from("bills").select("*").eq("id", billId).single(),
      supabase.from("bill_contents").select("*").eq("bill_id", billId),
      supabase.from("bills_tags").select("tag_id").eq("bill_id", billId),
      ensurePreviewToken(billId),
    ]
  );

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
  };
}

export async function ensurePreviewToken(billId: string): Promise<string> {
  if (isSetagayaMockMode) {
    return "mock-preview-token";
  }

  const supabase = createAdminClient();
  const now = new Date();
  const { data: existing, error: existingError } = await supabase
    .from("preview_tokens")
    .select("token, expires_at")
    .eq("bill_id", billId)
    .gt("expires_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to fetch preview token: ${existingError.message}`);
  }
  if (existing) return existing.token;

  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);
  const token = nanoid(32);
  const { error } = await supabase.from("preview_tokens").insert({
    bill_id: billId,
    token,
    expires_at: expiresAt.toISOString(),
    created_by: "admin",
  });

  if (error) {
    throw new Error(`Failed to create preview token: ${error.message}`);
  }

  return token;
}

async function resolveTagIds(tagIds: string[], newTags: NewTagInput[]) {
  if (newTags.length === 0) return Array.from(new Set(tagIds));

  const supabase = createAdminClient();
  const newLabels = Array.from(new Set(newTags.map((tag) => tag.label)));
  // UIを経由しない送信でも、既存タグ名を新規タグとして作れないようにする。
  const { data: existingTags, error: existingError } = await supabase
    .from("tags")
    .select("label")
    .in("label", newLabels);

  if (existingError) {
    throw new Error(`Failed to check tags: ${existingError.message}`);
  }

  if ((existingTags ?? []).length > 0) {
    throw new Error(
      `既存の小分類タグ「${existingTags?.map((tag) => tag.label).join("、")}」は新規追加できません。上の一覧から選択してください。`
    );
  }

  const { error: upsertError } = await supabase.from("tags").upsert(
    newTags.map((tag) => ({
      label: tag.label,
      major_category: tag.major_category,
    })),
    { onConflict: "label", ignoreDuplicates: true }
  );

  if (upsertError) {
    throw new Error(`Failed to create tags: ${upsertError.message}`);
  }

  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .in("label", newLabels);

  if (error) {
    throw new Error(`Failed to fetch created tags: ${error.message}`);
  }

  return Array.from(new Set([...tagIds, ...(data ?? []).map((tag) => tag.id)]));
}

export async function saveAdminBill(formData: FormData) {
  await requireAdmin();
  if (isSetagayaMockMode) {
    const id = nullableString(formData.get("id"));
    const target = id ? `/admin/bills/${id}/edit` : "/admin/bills/new";
    redirect(
      `${target}?error=${encodeURIComponent(
        "現在はローカルのモック表示中です。保存するにはSupabase接続を設定してください。"
      )}` as Route
    );
  }

  const parsed = parseBillFormDataOrRedirect(formData);
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const isPublishing = parsed.publish_status === "published";
  const thumbnailFile = (() => {
    try {
      return thumbnailFileFromFormData(formData);
    } catch (error) {
      redirectToAdminBillFormError(
        parsed.id,
        error instanceof Error
          ? error.message
          : "サムネイル画像を確認してください。"
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
          : "ナレッジソースファイルを読み取れませんでした。"
      );
    }
  })();

  let billId = parsed.id;
  let thumbnailUrl = parsed.thumbnail_url;

  if (billId && thumbnailFile) {
    try {
      thumbnailUrl = await uploadBillThumbnail(supabase, billId, thumbnailFile);
    } catch (error) {
      redirectToAdminBillFormError(
        billId,
        error instanceof Error
          ? error.message
          : "サムネイルのアップロードに失敗しました。"
      );
    }
  }

  const billPayload = {
    name: parsed.name,
    item_type: parsed.item_type,
    major_category: parsed.major_category,
    status: parsed.status,
    status_label: parsed.status_label,
    status_note: parsed.status_note,
    publish_status: parsed.publish_status,
    originating_house: "HR" as const,
    diet_session_id: parsed.diet_session_id,
    submitted_date: dateToTimestamp(parsed.submitted_date),
    published_at: isPublishing ? now : null,
    thumbnail_url: thumbnailUrl,
    share_thumbnail_url: parsed.share_thumbnail_url,
    sources: parsed.sources,
    knowledge_source: knowledgeSource,
    use_knowledge_source_in_chat: parsed.use_knowledge_source_in_chat,
    is_review_completed: parsed.is_review_completed,
    is_featured: parsed.is_featured,
    interview_enabled: parsed.interview_enabled,
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
      redirect(
        `/admin/bills/${billId}/edit?error=${encodeURIComponent(error.message)}` as Route
      );
    }
  } else {
    const { data, error } = await supabase
      .from("bills")
      .insert(billPayload)
      .select("id")
      .single();
    if (error || !data) {
      redirect(
        `/admin/bills/new?error=${encodeURIComponent(error?.message ?? "保存に失敗しました")}` as Route
      );
    }
    billId = data.id;

    if (thumbnailFile) {
      try {
        thumbnailUrl = await uploadBillThumbnail(
          supabase,
          billId,
          thumbnailFile
        );
      } catch (error) {
        redirectToAdminBillFormError(
          billId,
          error instanceof Error
            ? error.message
            : "サムネイルのアップロードに失敗しました。"
        );
      }

      const { error: thumbnailUpdateError } = await supabase
        .from("bills")
        .update({ thumbnail_url: thumbnailUrl, updated_at: now })
        .eq("id", billId);

      if (thumbnailUpdateError) {
        redirectToAdminBillFormError(billId, thumbnailUpdateError.message);
      }
    }
  }

  const hardTitle = parsed.hard_title || parsed.normal_title;
  const hardSummary = parsed.hard_summary || parsed.normal_summary;
  const hardContent = parsed.hard_content || parsed.normal_content;

  const { error: contentsError } = await supabase.from("bill_contents").upsert(
    [
      {
        bill_id: billId,
        difficulty_level: "normal" as const,
        title: parsed.normal_title,
        summary: parsed.normal_summary,
        content: parsed.normal_content,
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
    redirect(
      `/admin/bills/${billId}/edit?error=${encodeURIComponent(contentsError.message)}` as Route
    );
  }

  let resolvedTagIds: string[];
  try {
    resolvedTagIds = await resolveTagIds(parsed.tag_ids, parsed.new_tags);
  } catch (error) {
    redirect(
      `/admin/bills/${billId}/edit?error=${encodeURIComponent(
        error instanceof Error ? error.message : "タグの保存に失敗しました"
      )}` as Route
    );
  }
  const { error: deleteTagsError } = await supabase
    .from("bills_tags")
    .delete()
    .eq("bill_id", billId);

  if (deleteTagsError) {
    redirect(
      `/admin/bills/${billId}/edit?error=${encodeURIComponent(deleteTagsError.message)}` as Route
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
      redirect(
        `/admin/bills/${billId}/edit?error=${encodeURIComponent(insertTagsError.message)}` as Route
      );
    }
  }

  await ensurePreviewToken(billId);
  revalidateTag(CACHE_TAGS.BILLS);
  redirect(`/admin/bills/${billId}/edit?saved=1` as Route);
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

export function getPreviewPath(billId: string, token: string) {
  if (isSetagayaMockMode) {
    return routes.billDetail(billId);
  }

  return routes.previewBillDetail(billId, token);
}
