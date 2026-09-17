import type { Database } from "@mirai-gikai/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CHAT_AUTH_NEXT_COOKIE,
  sanitizeChatAuthNextPath,
} from "@/features/chat/shared/auth";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

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
    requestUrl.searchParams.get("next") ??
      cookieStore.get(CHAT_AUTH_NEXT_COOKIE)?.value
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

  const publicCommentPaths = [
    routes.publicCommentMinpaku(),
    routes.publicCommentIjime(),
    routes.publicCommentDisability(),
    routes.publicCommentRetainingWall(),
    routes.publicCommentDementiaHopePlan(),
  ];
  const failurePath = publicCommentPaths.includes(
    nextPath.split("?")[0] as (typeof publicCommentPaths)[number]
  )
    ? nextPath
    : "/";
  const failureUrl = new URL(failurePath, redirectBase);
  failureUrl.searchParams.set("auth_error", "google_login_failed");
  return NextResponse.redirect(failureUrl);
}
