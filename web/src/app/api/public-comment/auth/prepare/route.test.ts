import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  session: vi.fn(),
  createHandoff: vi.fn(),
}));

vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentActor: mocks.actor,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  findSessionForUser: mocks.session,
  createAuthHandoff: mocks.createHandoff,
}));

import { hashPublicCommentAuthToken } from "@/features/public-comment/shared/server/auth-handoff";
import { POST } from "./route";

function request(sessionId = "00000000-0000-4000-8000-000000000001") {
  return new Request("http://localhost/api/public-comment/auth/prepare", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

describe("POST /api/public-comment/auth/prepare", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.actor.mockResolvedValue({ id: "anonymous", is_anonymous: true });
    mocks.session.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      completed_at: null,
    });
  });

  it("所有者の匿名セッションに一度きりの引き継ぎCookieを発行する", async () => {
    const response = await POST(request());
    const cookie = response.headers.get("set-cookie") ?? "";
    const token = cookie.match(
      /mirai_public_comment_auth_handoff=([^;]+)/
    )?.[1];

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ handoffRequired: true });
    expect(token).toBeTruthy();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(mocks.createHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "00000000-0000-4000-8000-000000000001",
        anonymousUserId: "anonymous",
        tokenHash: hashPublicCommentAuthToken(decodeURIComponent(token ?? "")),
      })
    );
    expect(mocks.createHandoff.mock.calls[0][0].tokenHash).not.toBe(token);
  });

  it("別の利用者のセッションにはCookieを発行しない", async () => {
    mocks.session.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.createHandoff).not.toHaveBeenCalled();
  });

  it("すでにGoogle認証済みなら引き継ぎを作らない", async () => {
    mocks.actor.mockResolvedValue({ id: "google-user", is_anonymous: false });

    const response = await POST(request());

    expect(await response.json()).toEqual({ handoffRequired: false });
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.createHandoff).not.toHaveBeenCalled();
  });
});
