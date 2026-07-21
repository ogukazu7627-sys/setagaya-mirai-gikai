import "server-only";

import type { Database } from "@mirai-gikai/supabase";
import { createServerClient } from "@supabase/ssr";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { isAllowedAdminUser } from "./admin-access";

const ADMIN_HOME_PATH = "/admin/bills";
const LOGIN_PATH = "/admin/login";
const MOCK_ADMIN_USER = {
  email: "local-admin@example.com",
};
const isVercelProduction = process.env.VERCEL_ENV === "production";

export const isAdminAuthBypassed =
  !isVercelProduction &&
  (isSetagayaMockMode || process.env.SETAGAYA_ADMIN_NO_AUTH === "true");

export async function createAdminAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "setagaya-mock-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Server Components cannot mutate cookies. Middleware refreshes
              // sessions for normal requests, and Server Actions can set them.
            }
          }
        },
      },
    }
  );
}

export function isAdminUser(user: unknown): boolean {
  return isAllowedAdminUser(user, {
    adminEmails: process.env.SETAGAYA_ADMIN_EMAILS,
    requireEmailAllowlist: isVercelProduction,
  });
}

export async function requireAdmin(nextPath?: string) {
  if (isAdminAuthBypassed) {
    return MOCK_ADMIN_USER;
  }

  const supabase = await createAdminAuthClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || !isAdminUser(data.user)) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`${LOGIN_PATH}${next}` as Route);
  }

  return data.user;
}

export async function redirectAdminHome() {
  redirect(ADMIN_HOME_PATH as Route);
}
