// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicCouncilorXPost } from "../../shared/types/councilor-x-post";
import { CouncilorXPostsSection } from "./councilor-x-posts-section";

vi.mock("../../client/components/councilor-x-posts-carousel", () => ({
  CouncilorXPostsCarousel: ({ posts }: { posts: PublicCouncilorXPost[] }) => (
    <div data-testid="x-carousel">{posts.length}件</div>
  ),
}));

describe("CouncilorXPostsSection", () => {
  it("指定された見出しと説明文で投稿カルーセルを表示する", () => {
    render(
      <CouncilorXPostsSection
        posts={[
          {
            postId: "1234567890123456789",
            councilorName: "テスト議員",
            postUrl: "https://x.com/test_member/status/1234567890123456789",
            postedAt: "2026-07-27T00:00:00.000Z",
          },
        ]}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "世田谷区議会議員の最新発信",
      })
    ).toBeVisible();
    expect(
      screen.getByText("世田谷区議会議員のX投稿を、新しい順に掲載しています。")
    ).toBeVisible();
    expect(screen.getByTestId("x-carousel")).toHaveTextContent("1件");
  });

  it("保存済み投稿がない間もホーム全体を壊さず空状態を表示する", () => {
    render(<CouncilorXPostsSection posts={[]} />);

    expect(screen.getByText("最新の投稿を準備しています。")).toBeVisible();
    expect(screen.queryByTestId("x-carousel")).not.toBeInTheDocument();
  });
});
