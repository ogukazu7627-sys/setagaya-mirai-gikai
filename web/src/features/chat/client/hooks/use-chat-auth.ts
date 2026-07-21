"use client";

import { createBrowserClient } from "@mirai-gikai/supabase";
import { useCallback, useEffect, useState } from "react";
import {
  CHAT_AUTH_CALLBACK_PATH,
  CHAT_AUTH_NEXT_COOKIE,
  isGoogleAuthUser,
  sanitizeChatAuthNextPath,
} from "../../shared/auth";

export type ChatAuthStatus = "loading" | "authenticated" | "unauthenticated";

type ChatAuthState = {
  status: ChatAuthStatus;
  userEmail?: string;
  error?: string;
};

type UseChatAuthOptions = {
  disabled?: boolean;
};

function getCanonicalWebUrl() {
  const configured = process.env.NEXT_PUBLIC_WEB_URL;
  if (configured?.startsWith("http")) {
    return configured.replace(/\/+$/, "");
  }

  return window.location.origin;
}

function setReturnPathCookie() {
  const nextPath = sanitizeChatAuthNextPath(
    `${window.location.pathname}${window.location.search}`
  );
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // OAuth後のRoute Handlerで戻り先を読めるよう、短命cookieに保存する。
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store APIはSafari対応が弱いため
  document.cookie = `${CHAT_AUTH_NEXT_COOKIE}=${encodeURIComponent(
    nextPath
  )}; Path=/; Max-Age=600; SameSite=Lax${secure}`;
}

function getAuthStateFromUser(
  user: Parameters<typeof isGoogleAuthUser>[0]
): ChatAuthState {
  if (!isGoogleAuthUser(user)) {
    return { status: "unauthenticated" };
  }

  return {
    status: "authenticated",
    userEmail: typeof user?.email === "string" ? user.email : undefined,
  };
}

export function useChatAuth({ disabled = false }: UseChatAuthOptions = {}) {
  const [state, setState] = useState<ChatAuthState>(() =>
    disabled ? { status: "authenticated" } : { status: "loading" }
  );

  useEffect(() => {
    if (disabled) {
      setState({ status: "authenticated" });
      return;
    }

    let isMounted = true;
    const supabase = createBrowserClient();

    supabase.auth.getUser().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setState({ status: "unauthenticated" });
        return;
      }

      setState(getAuthStateFromUser(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setState(getAuthStateFromUser(session?.user));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [disabled]);

  const signInWithGoogle = useCallback(async () => {
    if (disabled) {
      return;
    }

    setState((current) => ({ ...current, error: undefined }));
    setReturnPathCookie();

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getCanonicalWebUrl()}${CHAT_AUTH_CALLBACK_PATH}`,
        scopes: "openid email profile",
      },
    });

    if (error) {
      setState({
        status: "unauthenticated",
        error:
          "Googleログインを開始できませんでした。時間をおいて再度お試しください。",
      });
    }
  }, [disabled]);

  return {
    ...state,
    signInWithGoogle,
  };
}
