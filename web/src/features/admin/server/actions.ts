"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  createAdminAuthClient,
  isAdminAuthBypassed,
  isAdminUser,
} from "./auth";
import { deleteAdminBill, saveAdminBill } from "./bill-admin";
import { saveAdminDietSession } from "./diet-session-admin";
import { buildAdminLoginErrorPath } from "./login-errors";

export async function loginAdminAction(formData: FormData) {
  if (isAdminAuthBypassed) {
    redirect("/admin/bills" as Route);
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/bills");

  if (!email || !password) {
    redirect(buildAdminLoginErrorPath("missing_credentials", next) as Route);
  }

  const supabase = await createAdminAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(buildAdminLoginErrorPath("login_failed", next) as Route);
  }

  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    redirect(buildAdminLoginErrorPath("not_admin", next) as Route);
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

export async function deleteAdminBillAction(formData: FormData) {
  await deleteAdminBill(formData);
}

export async function saveAdminDietSessionAction(formData: FormData) {
  await saveAdminDietSession(formData);
}
