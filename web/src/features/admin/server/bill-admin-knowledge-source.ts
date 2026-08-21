import "server-only";

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { createAdminClient } from "@mirai-gikai/supabase";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { AdminBillSaveError, type BillRow } from "./bill-admin-shared";
import { getFirstZodIssueMessage } from "./bill-admin-utils";

const MAX_KNOWLEDGE_SOURCE_LENGTH = 200_000;
const BILL_KNOWLEDGE_SOURCE_SELECT =
  "id, name, publish_status, publication_category, diet_session_id, knowledge_source, updated_at, published_at";

const uuidSchema = z.string().uuid("UUID形式で指定してください。");
const timestampSchema = z.iso.datetime({
  error: "オフセット付きISO 8601形式の日時を指定してください。",
  offset: true,
});
const knowledgeSourceSchema = z.union([
  z.null(),
  z
    .string()
    .max(
      MAX_KNOWLEDGE_SOURCE_LENGTH,
      `knowledge_sourceは${MAX_KNOWLEDGE_SOURCE_LENGTH.toLocaleString()}文字以下で指定してください。`
    )
    .refine(
      (value) => value.trim().length > 0,
      "knowledge_sourceを空にする場合はnullを指定してください。"
    ),
]);

const getPublishedBudgetKnowledgeSourceSchema = z
  .object({
    id: uuidSchema,
    diet_session_id: uuidSchema,
  })
  .strict();

const patchPublishedBudgetKnowledgeSourceSchema = z
  .object({
    id: uuidSchema,
    expected_name: z.string().min(1, "expected_nameを指定してください。"),
    diet_session_id: uuidSchema,
    expected_updated_at: timestampSchema,
    expected_published_at: timestampSchema.nullable(),
    expected_knowledge_source_sha256: z
      .string()
      .regex(
        /^[0-9a-f]{64}$/,
        "expected_knowledge_source_sha256は小文字のSHA-256形式で指定してください。"
      )
      .nullable(),
    knowledge_source: knowledgeSourceSchema,
    allow_clear: z.boolean().optional().default(false),
    dry_run: z.boolean().optional().default(true),
  })
  .strict();

type KnowledgeSourceBillRow = Pick<
  BillRow,
  | "id"
  | "name"
  | "publish_status"
  | "publication_category"
  | "diet_session_id"
  | "knowledge_source"
  | "updated_at"
  | "published_at"
>;

export type KnowledgeSourceStats = {
  knowledge_source_sha256: string | null;
  knowledge_source_length: number;
  knowledge_source_bytes: number;
};

export type KnowledgeSourceSnapshot = KnowledgeSourceStats & {
  updated_at: string;
  published_at: string | null;
};

export type GetPublishedBudgetKnowledgeSourceApiResponse =
  KnowledgeSourceStats & {
    success: true;
    bill_id: string;
    name: string;
    diet_session_id: string;
    publication_category: "budget";
    publish_status: "published";
    updated_at: string;
    published_at: string | null;
    knowledge_source: string | null;
  };

export type PatchPublishedBudgetKnowledgeSourceApiResponse = {
  success: true;
  bill_id: string;
  name: string;
  diet_session_id: string;
  publication_category: "budget";
  publish_status: "published";
  dry_run: boolean;
  updated: boolean;
  would_update: boolean;
  previous: KnowledgeSourceSnapshot;
  current: KnowledgeSourceSnapshot;
  candidate: KnowledgeSourceStats;
  warnings: Array<{
    code: "cache_revalidation_failed";
    message: string;
  }>;
};

function billIdFromUnknown(input: unknown): string | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }

  const id = (input as Record<string, unknown>).id;
  return typeof id === "string" ? id : undefined;
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AdminBillSaveError(
      getFirstZodIssueMessage(result.error),
      400,
      "invalid_request",
      billIdFromUnknown(input)
    );
  }

  return result.data;
}

function getKnowledgeSourceStats(
  knowledgeSource: string | null
): KnowledgeSourceStats {
  if (knowledgeSource === null) {
    return {
      knowledge_source_sha256: null,
      knowledge_source_length: 0,
      knowledge_source_bytes: 0,
    };
  }

  return {
    knowledge_source_sha256: createHash("sha256")
      .update(knowledgeSource, "utf8")
      .digest("hex"),
    knowledge_source_length: knowledgeSource.length,
    knowledge_source_bytes: Buffer.byteLength(knowledgeSource, "utf8"),
  };
}

function getKnowledgeSourceSnapshot(
  bill: KnowledgeSourceBillRow
): KnowledgeSourceSnapshot {
  return {
    updated_at: bill.updated_at,
    published_at: bill.published_at,
    ...getKnowledgeSourceStats(bill.knowledge_source),
  };
}

function revalidateBillsCache(
  billId: string
): PatchPublishedBudgetKnowledgeSourceApiResponse["warnings"] {
  try {
    revalidateTag(CACHE_TAGS.BILLS);
    return [];
  } catch {
    console.warn(
      "Published budget knowledge-source cache revalidation failed.",
      { billId }
    );
    return [
      {
        code: "cache_revalidation_failed",
        message: "キャッシュの即時再検証に失敗しました。",
      },
    ];
  }
}

function assertPublishedBudgetBill(
  bill: KnowledgeSourceBillRow,
  dietSessionId: string
): asserts bill is KnowledgeSourceBillRow & {
  publish_status: "published";
  publication_category: "budget";
  diet_session_id: string;
} {
  if (
    bill.publish_status !== "published" ||
    bill.publication_category !== "budget"
  ) {
    throw new AdminBillSaveError(
      "公開済みの予算記事だけが対象です。",
      409,
      "published_budget_required",
      bill.id
    );
  }

  if (bill.diet_session_id !== dietSessionId) {
    throw new AdminBillSaveError(
      "会期が指定と一致しません。",
      409,
      "diet_session_mismatch",
      bill.id
    );
  }
}

async function readBillById(id: string): Promise<KnowledgeSourceBillRow> {
  if (isSetagayaMockMode) {
    throw new AdminBillSaveError(
      "現在はローカルのモック表示中です。Supabase接続を設定してください。",
      503,
      "mock_mode",
      id
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(BILL_KNOWLEDGE_SOURCE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AdminBillSaveError(
      `対象記事の読み取りに失敗しました: ${error.message}`,
      500,
      "bill_lookup_failed",
      id
    );
  }

  if (!data) {
    throw new AdminBillSaveError(
      "対象記事が見つかりません。",
      404,
      "bill_not_found",
      id
    );
  }

  return data;
}

function throwOptimisticLockConflict(billId: string, field: string): never {
  throw new AdminBillSaveError(
    `対象記事の${field}が読み取り時から変更されています。再取得してから再試行してください。`,
    409,
    "optimistic_lock_conflict",
    billId
  );
}

function assertPatchGuards(
  bill: KnowledgeSourceBillRow,
  input: z.infer<typeof patchPublishedBudgetKnowledgeSourceSchema>
) {
  if (bill.name !== input.expected_name) {
    throwOptimisticLockConflict(bill.id, "タイトル");
  }
  if (bill.updated_at !== input.expected_updated_at) {
    throwOptimisticLockConflict(bill.id, "更新日時");
  }
  if (bill.published_at !== input.expected_published_at) {
    throwOptimisticLockConflict(bill.id, "公開日時");
  }

  const currentHash = getKnowledgeSourceStats(
    bill.knowledge_source
  ).knowledge_source_sha256;
  if (currentHash !== input.expected_knowledge_source_sha256) {
    throwOptimisticLockConflict(bill.id, "knowledge_source");
  }
}

export async function getPublishedBudgetKnowledgeSourceForApi(
  input: unknown
): Promise<GetPublishedBudgetKnowledgeSourceApiResponse> {
  const parsed = parseInput(getPublishedBudgetKnowledgeSourceSchema, input);
  const bill = await readBillById(parsed.id);
  assertPublishedBudgetBill(bill, parsed.diet_session_id);

  return {
    success: true,
    bill_id: bill.id,
    name: bill.name,
    diet_session_id: bill.diet_session_id,
    publication_category: bill.publication_category,
    publish_status: bill.publish_status,
    updated_at: bill.updated_at,
    published_at: bill.published_at,
    knowledge_source: bill.knowledge_source,
    ...getKnowledgeSourceStats(bill.knowledge_source),
  };
}

export async function patchPublishedBudgetKnowledgeSourceForApi(
  input: unknown
): Promise<PatchPublishedBudgetKnowledgeSourceApiResponse> {
  const parsed = parseInput(patchPublishedBudgetKnowledgeSourceSchema, input);
  if (parsed.knowledge_source === null && !parsed.allow_clear) {
    throw new AdminBillSaveError(
      "knowledge_sourceをnullにする場合はallow_clear: trueを指定してください。",
      400,
      "knowledge_source_clear_not_allowed",
      parsed.id
    );
  }

  const bill = await readBillById(parsed.id);
  assertPublishedBudgetBill(bill, parsed.diet_session_id);
  assertPatchGuards(bill, parsed);

  const previous = getKnowledgeSourceSnapshot(bill);
  const candidate = getKnowledgeSourceStats(parsed.knowledge_source);
  const hasChange = bill.knowledge_source !== parsed.knowledge_source;
  const baseResponse = {
    success: true as const,
    bill_id: bill.id,
    name: bill.name,
    diet_session_id: bill.diet_session_id,
    publication_category: bill.publication_category,
    publish_status: bill.publish_status,
    previous,
    candidate,
  };

  if (parsed.dry_run) {
    return {
      ...baseResponse,
      dry_run: true,
      updated: false,
      would_update: hasChange,
      current: previous,
      warnings: [],
    };
  }

  if (!hasChange) {
    return {
      ...baseResponse,
      dry_run: false,
      updated: false,
      would_update: false,
      current: previous,
      warnings: revalidateBillsCache(parsed.id),
    };
  }

  const supabase = createAdminClient();
  let updateQuery = supabase
    .from("bills")
    .update({ knowledge_source: parsed.knowledge_source })
    .eq("id", parsed.id)
    .eq("name", parsed.expected_name)
    .eq("publish_status", "published")
    .eq("publication_category", "budget")
    .eq("diet_session_id", parsed.diet_session_id)
    .eq("updated_at", parsed.expected_updated_at);

  updateQuery =
    parsed.expected_published_at === null
      ? updateQuery.is("published_at", null)
      : updateQuery.eq("published_at", parsed.expected_published_at);

  const { data: updatedBill, error: updateError } = await updateQuery
    .select(BILL_KNOWLEDGE_SOURCE_SELECT)
    .maybeSingle();

  if (updateError) {
    throw new AdminBillSaveError(
      `knowledge_sourceの更新に失敗しました: ${updateError.message}`,
      500,
      "knowledge_source_update_failed",
      parsed.id
    );
  }

  if (!updatedBill) {
    throwOptimisticLockConflict(parsed.id, "状態");
  }

  if (updatedBill.knowledge_source !== parsed.knowledge_source) {
    throw new AdminBillSaveError(
      "knowledge_sourceの更新結果を確認できませんでした。",
      500,
      "knowledge_source_readback_failed",
      parsed.id
    );
  }

  return {
    ...baseResponse,
    dry_run: false,
    updated: true,
    would_update: true,
    current: getKnowledgeSourceSnapshot(updatedBill),
    warnings: revalidateBillsCache(parsed.id),
  };
}
