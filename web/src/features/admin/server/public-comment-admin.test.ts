import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  not: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("@mirai-gikai/supabase", () => ({
  createAdminClient: () => ({
    from: mocks.from,
    auth: { admin: { getUserById: mocks.getUserById } },
  }),
}));

import { listPublicCommentAdminReviews } from "./public-comment-admin";

const campaign = {
  slug: "minpaku-2026",
  title: "民泊のパブリックコメント",
  official_url: "https://example.com/comment",
};

function createRow(params: {
  id: string;
  userId: string;
  status: "private" | "pending_review" | "published";
}) {
  return {
    id: params.id,
    completed_at: "2026-09-20T01:00:00.000Z",
    publication_status: params.status,
    user_id: params.userId,
    public_comment_campaigns: campaign,
    public_comment_drafts: {
      final_body: `最終本文 ${params.id}`,
      target_ordinances: [],
      fact_check_notes: [],
      reviewed_at: null,
    },
    public_comment_messages: [
      {
        id: `${params.id}-answer`,
        role: "user",
        content: "回答",
        created_at: "2026-09-20T00:02:00.000Z",
      },
      {
        id: `${params.id}-question`,
        role: "assistant",
        content: "質問",
        created_at: "2026-09-20T00:01:00.000Z",
      },
    ],
  };
}

describe("listPublicCommentAdminReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ not: mocks.not });
    mocks.not.mockReturnValue({ in: mocks.in });
    mocks.in.mockReturnValue({ order: mocks.order });
    mocks.order.mockResolvedValue({
      data: [
        createRow({ id: "private-1", userId: "user-1", status: "private" }),
        createRow({
          id: "pending-1",
          userId: "user-2",
          status: "pending_review",
        }),
        createRow({
          id: "published-1",
          userId: "user-1",
          status: "published",
        }),
      ],
      error: null,
    });
    mocks.getUserById.mockImplementation(async (userId: string) => ({
      data: { user: { email: `${userId}@example.com` } },
      error: null,
    }));
  });

  it("完了済みの非公開・確認待ち・公開中を分け、メールと会話順を返す", async () => {
    const result = await listPublicCommentAdminReviews();

    expect(mocks.from).toHaveBeenCalledWith("public_comment_sessions");
    expect(mocks.not).toHaveBeenCalledWith("completed_at", "is", null);
    expect(mocks.in).toHaveBeenCalledWith("publication_status", [
      "private",
      "pending_review",
      "published",
    ]);
    expect(mocks.getUserById).toHaveBeenCalledTimes(2);
    expect(result.private).toHaveLength(1);
    expect(result.pending).toHaveLength(1);
    expect(result.published).toHaveLength(1);
    expect(result.private[0]).toMatchObject({
      id: "private-1",
      user_email: "user-1@example.com",
      publication_status: "private",
    });
    expect(
      result.private[0]?.messages.map((message) => message.content)
    ).toEqual(["質問", "回答"]);
  });
});
