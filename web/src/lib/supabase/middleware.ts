import type { Database } from "@mirai-gikai/supabase";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const SUPABASE_SESSION_REFRESH_TIMEOUT_MS = 3_000;

type FetchImplementation = typeof fetch;

export function isSupabaseAuthCookieName(name: string): boolean {
  return (
    name === "sb-access-token" ||
    name === "sb-refresh-token" ||
    /^sb-.+-auth-token(?:\.\d+)?$/u.test(name)
  );
}

export function hasSupabaseAuthCookie(
  cookies: ReadonlyArray<{ name: string }>
): boolean {
  return cookies.some((cookie) => isSupabaseAuthCookieName(cookie.name));
}

export function createFetchWithTimeout(
  timeoutMs = SUPABASE_SESSION_REFRESH_TIMEOUT_MS,
  fetchImplementation: FetchImplementation = fetch
): FetchImplementation {
  return async (input, init) => {
    const controller = new AbortController();
    const upstreamSignal = init?.signal;
    const abortFromUpstream = () => {
      controller.abort(upstreamSignal?.reason);
    };

    if (upstreamSignal?.aborted) {
      abortFromUpstream();
    } else {
      upstreamSignal?.addEventListener("abort", abortFromUpstream, {
        once: true,
      });
    }

    const timeoutId = setTimeout(() => {
      controller.abort(
        new DOMException(
          `Supabase auth request timed out after ${timeoutMs}ms`,
          "TimeoutError"
        )
      );
    }, timeoutMs);

    try {
      return await fetchImplementation(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      upstreamSignal?.removeEventListener("abort", abortFromUpstream);
    }
  };
}

/**
 * ミドルウェアでSupabaseセッションをリフレッシュする
 * リクエストごとにアクセストークンの有効期限を確認し、
 * 期限切れの場合はリフレッシュトークンで自動更新してcookieに書き戻す
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 匿名リクエストには更新すべきセッションがない。
  // Middlewareから外部通信しないことで、公開ページを認証基盤の遅延から切り離す。
  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      global: {
        fetch: createFetchWithTimeout(),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({
            request,
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // トークンリフレッシュをトリガーする
  // getUser() はサーバーに問い合わせてトークンの有効性を確認し、
  // 期限切れの場合は自動的にリフレッシュする
  const startedAt = Date.now();
  try {
    const { error } = await supabase.auth.getUser();
    if (error) {
      console.warn(
        JSON.stringify({
          level: "warning",
          message: "Supabase session refresh was rejected",
          error: error.message,
          path: request.nextUrl.pathname,
          requestId: request.headers.get("x-vercel-id"),
          durationMs: Date.now() - startedAt,
        })
      );
    }
  } catch (error) {
    // セッション更新の障害で公開サイト全体を504にしない。
    // 管理権限は各Server Component / ActionのrequireAdminで再検証される。
    console.error(
      JSON.stringify({
        level: "error",
        message: "Supabase session refresh failed open",
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
        requestId: request.headers.get("x-vercel-id"),
        durationMs: Date.now() - startedAt,
      })
    );
  }

  return supabaseResponse;
}
