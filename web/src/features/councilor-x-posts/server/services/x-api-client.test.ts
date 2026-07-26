import { describe, expect, it, vi } from "vitest";
import { createXApiClient, XApiResourceUnavailableError } from "./x-api-client";

describe("createXApiClient", () => {
  it("ユーザー名を一括検索し、公開状態と不正行を安全に変換する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        data: [
          {
            id: "2244994945",
            username: "PublicMember",
            protected: false,
          },
          {
            id: "1234567890123456789",
            username: "ProtectedMember",
            protected: true,
          },
          {
            id: "invalid",
            username: "InvalidMember",
          },
        ],
        errors: [{ title: "Not Found" }],
      })
    );
    const client = createXApiClient({
      bearerToken: "server-secret-token",
      fetchImpl,
    });

    await expect(
      client.findUsersByUsernames(["PublicMember", "ProtectedMember", "Gone"])
    ).resolves.toEqual([
      {
        id: "2244994945",
        username: "PublicMember",
        protected: false,
      },
      {
        id: "1234567890123456789",
        username: "ProtectedMember",
        protected: true,
      },
    ]);

    const [url, options] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain(
      "usernames=PublicMember%2CProtectedMember%2CGone"
    );
    expect(String(url)).toContain("user.fields=protected");
    expect(String(url)).not.toContain("server-secret-token");
    expect(options?.headers).toEqual({
      Authorization: "Bearer server-secret-token",
    });
  });

  it("公開投稿取得で返信とリポストを除外しBearer Tokenをヘッダーだけに置く", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        data: [
          {
            id: "1234567890123456789",
            created_at: "2026-07-27T09:00:00.000Z",
            referenced_tweets: [{ type: "quoted", id: "1" }],
          },
        ],
        meta: { next_token: "next-page" },
      })
    );
    const client = createXApiClient({
      bearerToken: "server-secret-token",
      fetchImpl,
    });

    const page = await client.findUserPosts({
      userId: "2244994945",
      sinceId: "100",
      maxResults: 5,
    });

    const [url, options] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain("exclude=replies%2Cretweets");
    expect(String(url)).toContain("since_id=100");
    expect(String(url)).not.toContain("server-secret-token");
    expect(options?.headers).toEqual({
      Authorization: "Bearer server-secret-token",
    });
    expect(page).toEqual({
      posts: [
        {
          id: "1234567890123456789",
          createdAt: "2026-07-27T09:00:00.000Z",
          referencedPostTypes: ["quoted"],
        },
      ],
      nextToken: "next-page",
    });
  });

  it("公開されていないアカウントを専用エラーとして扱う", async () => {
    const client = createXApiClient({
      bearerToken: "server-secret-token",
      fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    });

    await expect(
      client.findUserPosts({
        userId: "2244994945",
        maxResults: 5,
      })
    ).rejects.toBeInstanceOf(XApiResourceUnavailableError);
  });

  it("APIエラーへトークンやレスポンス本文を含めない", async () => {
    const client = createXApiClient({
      bearerToken: "never-log-this-token",
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          new Response('{"detail":"sensitive response"}', { status: 429 })
        ),
    });

    const error = await client
      .findUsersByUsernames(["example"])
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("never-log-this-token");
    expect((error as Error).message).not.toContain("sensitive response");
    expect((error as Error).message).toContain("status 429");
  });
});
