export const CHAT_AUTH_CALLBACK_PATH = "/auth/callback";
export const CHAT_AUTH_NEXT_COOKIE = "mirai_chat_auth_next";

type SupabaseAuthUserLike = {
  email?: unknown;
  app_metadata?: {
    provider?: unknown;
    providers?: unknown;
  } | null;
  identities?: Array<{ provider?: unknown } | null> | null;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function sanitizeChatAuthNextPath(value: string | null | undefined) {
  if (!value) {
    return "/";
  }

  const decoded = safeDecode(value).trim();
  if (
    hasControlCharacter(decoded) ||
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.startsWith(CHAT_AUTH_CALLBACK_PATH)
  ) {
    return "/";
  }

  return decoded;
}

export function isGoogleAuthUser(
  user: SupabaseAuthUserLike | null | undefined
): boolean {
  if (!user) {
    return false;
  }

  if (user.app_metadata?.provider === "google") {
    return true;
  }

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("google")) {
    return true;
  }

  return Boolean(
    user.identities?.some((identity) => identity?.provider === "google")
  );
}
