"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  createAdminAuthClient,
  isAdminAuthBypassed,
  isAdminUser,
} from "./auth";
import { saveAdminBill } from "./bill-admin";

export async function loginAdminAction(formData: FormData) {
  if (isAdminAuthBypassed) {
    redirect("/admin/bills" as Route);
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/bills");

  if (!email || !password) {
    redirect(
      "/admin/login?error=メールアドレスとパスワードを入力してください" as Route
    );
  }

  const supabase = await createAdminAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect("/admin/login?error=ログインに失敗しました" as Route);
  }

  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=管理者権限がありません" as Route);
  }

  redirect((next.startsWith("/admin") ? next : "/admin/bills") as Route);
}

export async function logoutAdminAction() {
  if (isAdminAuthBypassed) {
    redirect("/admin/bills" as Route);
  }

  const supabase = await createAdminAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login" as Route);
}

export async function saveAdminBillAction(formData: FormData) {
  await saveAdminBill(formData);
}
