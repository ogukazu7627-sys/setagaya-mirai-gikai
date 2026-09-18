import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/features/chat/server/utils/supabase-server", () => ({
  getChatSupabaseUser: mocks.getUser,
}));

import { getPublicCommentActor, getPublicCommentUser } from "./auth";

describe("getPublicCommentUser", () => {
  beforeEach(() => vi.resetAllMocks());

  it("匿名ユーザーもインタビューの参加者として返す", async () => {
    const anonymousUser = { id: "anonymous", is_anonymous: true };
    mocks.getUser.mockResolvedValue({
      data: { user: anonymousUser },
      error: null,
    });

    expect(await getPublicCommentActor()).toBe(anonymousUser);
  });

  it("認証セッションの検証エラー時は匿名ユーザーも返さない", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "anonymous", is_anonymous: true } },
      error: new Error("expired"),
    });

    expect(await getPublicCommentActor()).toBeNull();
  });

  it.each([
    null,
    { id: "anon", is_anonymous: true },
    {
      id: "email",
      email: "user@example.com",
      app_metadata: { provider: "email" },
    },
    {
      id: "spoofed",
      email: "user@example.com",
      user_metadata: { provider: "google" },
    },
    { id: "no-email", app_metadata: { provider: "google" } },
    {
      id: "anon-google",
      is_anonymous: true,
      email: "user@example.com",
      app_metadata: { provider: "google" },
    },
  ])("匿名・非Google・未確認データを拒否する: %j", async (user) => {
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await getPublicCommentUser()).toBeNull();
  });

  it("サーバーで検証されたGoogleユーザーを返す", async () => {
    const user = {
      id: "google",
      email: "user@example.com",
      is_anonymous: false,
      app_metadata: { provider: "google" },
    };
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await getPublicCommentUser()).toBe(user);
    mocks.getUser.mockResolvedValue({
      data: { user },
      error: new Error("expired"),
    });
    expect(await getPublicCommentUser()).toBeNull();
  });
});
