// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicCommentReviewItem } from "../server/public-comment-admin";
import { PublicCommentReviewCard } from "./public-comment-review-card";

vi.mock("../server/public-comment-admin-actions", () => ({
  updatePublicCommentReviewStatusAction: vi.fn(),
}));

const item: PublicCommentReviewItem = {
  id: "session-1",
  completed_at: "2026-09-20T01:00:00.000Z",
  publication_status: "private",
  user_email: "participant@example.com",
  campaign: {
    slug: "minpaku-2026",
    title: "民泊のパブリックコメント",
    official_url: "https://example.com/comment",
  },
  draft: {
    final_body: "住環境と安全に配慮した制度を求めます。",
    target_ordinances: [],
    fact_check_notes: [],
    reviewed_at: null,
  },
  messages: [
    {
      id: "message-1",
      role: "assistant",
      content: "特に気になる点は何ですか？",
      created_at: "2026-09-20T00:01:00.000Z",
    },
    {
      id: "message-2",
      role: "user",
      content: "夜間の騒音です。",
      created_at: "2026-09-20T00:02:00.000Z",
    },
  ],
};

describe("PublicCommentReviewCard", () => {
  it("非公開意見は本文・メール・質問履歴を表示し、公開操作を出さない", () => {
    render(<PublicCommentReviewCard item={item} mode="private" />);

    expect(screen.getByText("非公開（公開不可）")).toBeTruthy();
    expect(
      screen.getByText("メールアドレス: participant@example.com")
    ).toBeTruthy();
    expect(
      screen.getByText("住環境と安全に配慮した制度を求めます。")
    ).toBeTruthy();
    expect(screen.getByText("質問と回答の推移を確認")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "公開" })).toBeNull();
    expect(screen.queryByRole("button", { name: "却下" })).toBeNull();
    expect(screen.queryByRole("button", { name: "公開停止" })).toBeNull();
  });

  it("公開希望の確認待ちには従来どおり公開・却下操作を出す", () => {
    render(
      <PublicCommentReviewCard
        item={{ ...item, publication_status: "pending_review" }}
        mode="pending"
      />
    );

    expect(screen.getByRole("button", { name: "公開" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "却下" })).toBeTruthy();
  });
});
