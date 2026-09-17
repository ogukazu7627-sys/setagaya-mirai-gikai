// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAT_AUTH_NEXT_COOKIE } from "../../shared/auth";
import { useChatAuth } from "./use-chat-auth";
import { GoogleLoginGate } from "../components/google-login-gate";

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("@mirai-gikai/supabase", () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      signInWithOAuth: mocks.signIn,
    },
  }),
}));

describe("useChatAuth OAuth return path", () => {
  beforeEach(() => {
    mocks.signIn.mockReset().mockResolvedValue({ error: null });
    vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://civictech-setagaya.org");
    window.history.replaceState(null, "", "/public-comment/minpaku?share=x");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("既存のログインボタンからクリックイベントが渡っても現在ページを保持する", async () => {
    window.history.replaceState(null, "", "/bills/example?difficulty=hard");
    const { result } = renderHook(() => useChatAuth());
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    render(
      createElement(GoogleLoginGate, {
        message: "ログインしてください",
        isAuthLoading: false,
        onSignInWithGoogle: result.current.signInWithGoogle,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(1));
    const callback = new URL(mocks.signIn.mock.calls[0][0].options.redirectTo);
    expect(callback.searchParams.get("next")).toBe(
      "/bills/example?difficulty=hard"
    );
  });

  it.each([
    [undefined, "/public-comment/minpaku?share=x"],
    [
      "/public-comment/minpaku?auth_return=1&receipt=0",
      "/public-comment/minpaku?auth_return=1&receipt=0",
    ],
  ])("Cookieが保存されなくても認証URLに戻り先を渡す: %s", async (requested, expected) => {
    const cookieWrite = vi
      .spyOn(document, "cookie", "set")
      .mockImplementation(() => {});
    const { result } = renderHook(() => useChatAuth());
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    await act(async () => {
      await result.current.signInWithGoogle(requested);
    });
    expect(cookieWrite).toHaveBeenCalledWith(
      expect.stringContaining(CHAT_AUTH_NEXT_COOKIE)
    );
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    const request = mocks.signIn.mock.calls[0][0];
    const callback = new URL(request.options.redirectTo);
    expect(request.provider).toBe("google");
    expect(callback.origin).toBe("https://civictech-setagaya.org");
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("next")).toBe(expected);
  });
});
