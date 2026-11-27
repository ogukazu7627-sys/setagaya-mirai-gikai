import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import {
  adminDietSessionCreateApiSchema,
  findDietSessionByComparableName,
} from "../shared/admin-diet-session-api";
import {
  AdminBillSaveError,
  type AdminSupabaseClient,
  type DietSessionRow,
} from "./bill-admin-shared";

export type AdminDietSessionApiItem = Pick<
  DietSessionRow,
  "id" | "name" | "slug" | "start_date" | "end_date" | "is_active"
>;

export type CreateAdminDietSessionApiResult = {
  mode: "created" | "conflict";
  dietSession: AdminDietSessionApiItem;
};

const DIET_SESSION_API_COLUMNS =
  "id, name, slug, start_date, end_date, is_active";
const POSTGRES_UNIQUE_VIOLATION = "23505";

function assertNotMockMode() {
  if (isSetagayaMockMode) {
    throw new AdminBillSaveError(
      "現在はローカルのモック表示中です。会期を扱うにはSupabase接続を設定してください。",
      503,
      "mock_mode"
    );
  }
}

async function fetchDietSessions(
  supabase: AdminSupabaseClient
): Promise<AdminDietSessionApiItem[]> {
  const { data, error } = await supabase
    .from("diet_sessions")
    .select(DIET_SESSION_API_COLUMNS)
    .order("start_date", { ascending: false });

  if (error) {
    throw new AdminBillSaveError(
      `会期の取得に失敗しました: ${error.message}`,
      500,
      "diet_sessions_lookup_failed"
    );
  }

  return data ?? [];
}

export async function listAdminDietSessionsForApi(): Promise<
  AdminDietSessionApiItem[]
> {
  assertNotMockMode();
  return fetchDietSessions(createAdminClient());
}

/**
 * 会期を1件登録する。
 * 空白や全角・半角の違いだけの同名の会期がすでにあれば登録せず、既存の会期を返す。
 * is_active（トップページに出す会期）や既存会期の更新・削除はAPIでは扱わない。
 */
export async function createAdminDietSessionFromJson(
  body: unknown
): Promise<CreateAdminDietSessionApiResult> {
  assertNotMockMode();

  const parsed = adminDietSessionCreateApiSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminBillSaveError(
      parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      400,
      "invalid_diet_session"
    );
  }

  const supabase = createAdminClient();
  const existing = findDietSessionByComparableName(
    await fetchDietSessions(supabase),
    parsed.data.name
  );
  if (existing) {
    return { mode: "conflict", dietSession: existing };
  }

  const { data, error } = await supabase
    .from("diet_sessions")
    .insert(parsed.data)
    .select(DIET_SESSION_API_COLUMNS)
    .single();

  if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
    throw new AdminBillSaveError(
      "同じslugの会期がすでに登録されています",
      409,
      "diet_session_slug_conflict"
    );
  }
  if (error || !data) {
    throw new AdminBillSaveError(
      `会期の登録に失敗しました: ${error?.message ?? "不明なエラー"}`,
      500,
      "diet_session_create_failed"
    );
  }

  revalidateTag(CACHE_TAGS.DIET_SESSIONS);

  return { mode: "created", dietSession: data };
}
