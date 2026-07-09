import { type NextRequest, NextResponse } from "next/server";
import {
  DIFFICULTY_COOKIE_NAME,
  DIFFICULTY_COOKIE_OPTIONS,
  type DifficultyLevelEnum,
  VALID_DIFFICULTY_LEVELS,
} from "./features/bill-difficulty/shared/types";
import { CHAT_AUTH_CALLBACK_PATH } from "./features/chat/shared/auth";
import {
  createUnauthorizedResponse,
  getBasicAuthConfig,
  isPageSpeedInsights,
  validateBasicAuth,
} from "./lib/basic-auth";
import { updateSupabaseSession } from "./lib/supabase/middleware";

const UTM_SHORT_LINKS = {
  "/ig": {
    source: "instagram",
    medium: "social",
    campaign: "launch",
  },
  "/x": {
    source: "x",
    medium: "social",
    campaign: "launch",
  },
  "/note": {
    source: "note",
    medium: "referral",
    campaign: "launch",
  },
  "/line": {
    source: "line",
    medium: "social",
    campaign: "launch",
  },
  "/qr": {
    source: "qr",
    medium: "offline",
    campaign: "launch",
  },
} as const;

export async function middleware(request: NextRequest) {
  const utmRedirectUrl = buildUtmShortLinkRedirectUrl(request.nextUrl);
  if (utmRedirectUrl) {
    return NextResponse.redirect(utmRedirectUrl);
  }

  // /dev routes: 本番では404、開発ではauthスキップ
  if (request.nextUrl.pathname.startsWith("/dev")) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
    return NextResponse.next();
  }

  // OAuth callbackではPKCE code-verifier cookieが必要。
  // ここでgetUser()を走らせるとログイン前扱いでcode-verifierが消えるためスキップする。
  const response = shouldSkipSupabaseSessionUpdate(request.nextUrl.pathname)
    ? NextResponse.next({ request })
    : await updateSupabaseSession(request);

  // URLパラメータからdifficulty Cookieをセット
  _applyDifficultyCookie(request, response);

  const authConfig = getBasicAuthConfig();

  // Basic認証の設定がない場合はスキップ
  if (!authConfig) {
    return response;
  }

  // HTML ナビゲーションだけ認証（画像やJSON, css/js, fetch等は通す）
  if (!_isHtmlRequest(request)) return response;

  // PageSpeed Insightsからのアクセスは認証をスキップ
  if (isPageSpeedInsights(request)) {
    return response;
  }

  // Basic認証の検証
  if (validateBasicAuth(request, authConfig)) {
    return response;
  }

  return createUnauthorizedResponse();
}

/**
 * 有効な難易度レベルかチェック
 */
export function isValidDifficultyLevel(
  value: string | null
): value is DifficultyLevelEnum {
  if (!value) return false;
  return VALID_DIFFICULTY_LEVELS.includes(value as DifficultyLevelEnum);
}

/**
 * URLパラメータからdifficultyを取得し、レスポンスのCookieにセット
 */
function _applyDifficultyCookie(
  request: NextRequest,
  response: NextResponse
): void {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");

  if (isValidDifficultyLevel(difficulty)) {
    response.cookies.set(
      DIFFICULTY_COOKIE_NAME,
      difficulty,
      DIFFICULTY_COOKIE_OPTIONS
    );
  }
}

export function isHtmlAcceptHeader(accept: string): boolean {
  return accept.includes("text/html");
}

function _isHtmlRequest(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  return isHtmlAcceptHeader(accept);
}

export function shouldSkipSupabaseSessionUpdate(pathname: string): boolean {
  return pathname === CHAT_AUTH_CALLBACK_PATH;
}

export function buildUtmShortLinkRedirectUrl(
  nextUrl: Pick<URL, "origin" | "pathname">
): URL | null {
  const pathname = normalizeShortLinkPath(nextUrl.pathname);
  const utm = UTM_SHORT_LINKS[pathname as keyof typeof UTM_SHORT_LINKS];

  if (!utm) {
    return null;
  }

  const redirectUrl = new URL("/", nextUrl.origin);
  redirectUrl.searchParams.set("utm_source", utm.source);
  redirectUrl.searchParams.set("utm_medium", utm.medium);
  redirectUrl.searchParams.set("utm_campaign", utm.campaign);
  return redirectUrl;
}

function normalizeShortLinkPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export const config = {
  matcher: [
    /*
     * _next/static, _next/image, favicon.ico, 画像ファイル等の
     * 静的アセットを除外し、ページリクエストのみでミドルウェアを実行する
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
