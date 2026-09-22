import type { Database } from "@mirai-gikai/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CHAT_AUTH_NEXT_COOKIE,
  sanitizeChatAuthNextPath,
} from "@/features/chat/shared/auth";
import { consumeAuthHandoff } from "@/features/public-comment/minpaku/server/repository";
import { PUBLIC_COMMENT_AUTH_HANDOFF_COOKIE } from "@/features/public-comment/shared/auth-handoff";
import { hashPublicCommentAuthToken } from "@/features/public-comment/shared/server/auth-handoff";
import { markPublicCommentGoogleClaimed } from "@/features/public-comment/shared/server/funnel-repository";
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
  const publicCommentHandoff = cookieStore.get(
    PUBLIC_COMMENT_AUTH_HANDOFF_COOKIE
  )?.value;

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (publicCommentHandoff) {
        if (!data?.user) {
          const failureUrl = new URL(nextPath, redirectBase);
          failureUrl.searchParams.set("auth_error", "handoff_failed");
          return NextResponse.redirect(failureUrl);
        }
        try {
          const claimedSessionId = await consumeAuthHandoff({
            tokenHash: hashPublicCommentAuthToken(publicCommentHandoff),
            targetUserId: data.user.id,
          });
          try {
            await markPublicCommentGoogleClaimed(claimedSessionId);
          } catch {
            console.warn("public_comment_funnel_google_claim_tracking_failed");
          }
          cookieStore.set(PUBLIC_COMMENT_AUTH_HANDOFF_COOKIE, "", {
            path: "/",
            maxAge: 0,
          });
        } catch {
          const failureUrl = new URL(nextPath, redirectBase);
          failureUrl.searchParams.set("auth_error", "handoff_failed");
          return NextResponse.redirect(failureUrl);
        }
      }
      return NextResponse.redirect(`${redirectBase}${nextPath}`);
    }
  }

  const publicCommentPaths = [
    routes.publicCommentMinpaku(),
    routes.publicCommentIjime(),
    routes.publicCommentDisability(),
    routes.publicCommentRetainingWall(),
    routes.publicCommentElderlyCarePlan(),
    routes.publicCommentInclusionPlan(),
    routes.publicCommentGenderEquality(),
    routes.publicCommentSuicidePrevention(),
    routes.publicCommentDementiaHopePlan(),
    routes.publicCommentTrafficSafetyPlan(),
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
