import "server-only";

import type { Database } from "@mirai-gikai/supabase";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { Route } from "next";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { routes } from "@/lib/routes";
import {
  getSetagayaMockSession,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import { requireAdmin } from "./auth";

export type AdminDietSession =
  Database["public"]["Tables"]["diet_sessions"]["Row"];

const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください");

const dietSessionFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "会期名は必須です"),
    start_date: dateInputSchema,
    end_date: dateInputSchema,
    slug: z.string().trim().nullable(),
    is_active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.end_date < value.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "会期の終了日は開始日以降にしてください",
      });
    }
  });

function nullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildAdminDietSessionErrorPath(
  sessionId: string | undefined,
  message: string
): Route {
  const target = sessionId
    ? routes.adminDietSessionEdit(sessionId)
    : routes.adminDietSessions();
  return `${target}?error=${encodeURIComponent(message)}` as Route;
}

function parseDietSessionFormData(formData: FormData) {
  const id = nullableString(formData.get("id")) ?? undefined;
  return dietSessionFormSchema.parse({
    id,
    name: formData.get("name"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    slug: nullableString(formData.get("slug")),
    is_active: formData.get("is_active") === "on",
  });
}

function parseDietSessionFormDataOrRedirect(formData: FormData) {
  try {
    return parseDietSessionFormData(formData);
  } catch (error) {
    const id = nullableString(formData.get("id")) ?? undefined;
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "入力内容を確認してください")
        : "入力内容を確認してください";
    redirect(buildAdminDietSessionErrorPath(id, message));
  }
}

function mockDietSessions(): AdminDietSession[] {
  return [getSetagayaMockSession() as AdminDietSession];
}

export async function listAdminDietSessions(): Promise<AdminDietSession[]> {
  await requireAdmin(routes.adminDietSessions());

  if (isSetagayaMockMode) {
    return mockDietSessions();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch diet sessions: ${error.message}`);
  }

  return data ?? [];
}

export async function getAdminDietSession(
  sessionId: string
): Promise<AdminDietSession | null> {
  await requireAdmin(routes.adminDietSessionEdit(sessionId));

  if (isSetagayaMockMode) {
    return (
      mockDietSessions().find((session) => session.id === sessionId) ?? null
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch diet session: ${error.message}`);
  }

  return data;
}

export async function saveAdminDietSession(formData: FormData) {
  await requireAdmin(routes.adminDietSessions());

  const parsed = parseDietSessionFormDataOrRedirect(formData);

  if (isSetagayaMockMode) {
    redirect(
      buildAdminDietSessionErrorPath(
        parsed.id,
        "現在はローカルのモック表示中です。保存するにはSupabase接続を設定してください。"
      )
    );
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const payload = {
    name: parsed.name,
    start_date: parsed.start_date,
    end_date: parsed.end_date,
    slug: parsed.slug,
    is_active: false,
    updated_at: now,
  };

  const { data, error } = parsed.id
    ? await supabase
        .from("diet_sessions")
        .update(payload)
        .eq("id", parsed.id)
        .select("id")
        .single()
    : await supabase
        .from("diet_sessions")
        .insert(payload)
        .select("id")
        .single();

  if (error || !data) {
    redirect(
      buildAdminDietSessionErrorPath(
        parsed.id,
        `会期の保存に失敗しました: ${error?.message ?? "不明なエラー"}`
      )
    );
  }

  if (parsed.is_active) {
    const { error: activeError } = await supabase.rpc(
      "set_active_diet_session",
      { target_session_id: data.id }
    );

    if (activeError) {
      redirect(
        buildAdminDietSessionErrorPath(
          data.id,
          `現在の会期への切り替えに失敗しました: ${activeError.message}`
        )
      );
    }
  }

  revalidateTag(CACHE_TAGS.DIET_SESSIONS);
  revalidateTag(CACHE_TAGS.BILLS);
  redirect(`${routes.adminDietSessions()}?saved=1` as Route);
}
