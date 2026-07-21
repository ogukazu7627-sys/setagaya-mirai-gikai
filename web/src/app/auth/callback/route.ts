import type { Database } from "@mirai-gikai/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CHAT_AUTH_NEXT_COOKIE,
  sanitizeChatAuthNextPath,
} from "@/features/chat/shared/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function getRedirectBase(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return new URL(request.url).origin;
  }

  return env.webUrl.replace(/\/+$/, "");
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const nextPath = sanitizeChatAuthNextPath(
    cookieStore.get(CHAT_AUTH_NEXT_COOKIE)?.value ??
      requestUrl.searchParams.get("next")
  );
  const redirectBase = getRedirectBase(request);

  cookieStore.set(CHAT_AUTH_NEXT_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  if (code) {
    const supabase = createServerClient<Database>(
      env.supabaseUrl,
      env.supabasePublishableKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${redirectBase}${nextPath}`);
    }
  }

  return NextResponse.redirect(
    `${redirectBase}/?auth_error=google_login_failed`
  );
}
