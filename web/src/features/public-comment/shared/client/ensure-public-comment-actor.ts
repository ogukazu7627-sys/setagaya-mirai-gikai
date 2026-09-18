"use client";

import { createBrowserClient } from "@mirai-gikai/supabase";

export async function ensurePublicCommentActor() {
  const supabase = createBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (user && !error) return user;

  const { data, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError || !data.user)
    throw new Error(
      "匿名セッションを開始できませんでした。時間をおいてもう一度お試しください。"
    );
  return data.user;
}
