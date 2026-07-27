// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicCouncilorXPost } from "../../shared/types/councilor-x-post";
import { XEmbeddedPost } from "./x-embedded-post";

const post: PublicCouncilorXPost = {
  postId: "1234567890123456789",
  councilorName: "テスト議員",
  postUrl: "https://x.com/test_member/status/1234567890123456789",
  postedAt: "2026-07-27T00:30:00.000Z",
};

describe("XEmbeddedPost", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete window.twttr;
  });

  it("公式埋め込み失敗時に議員名・日時・Xリンクを表示する", async () => {
    window.twttr = {
      widgets: {
        createTweet: vi.fn().mockResolvedValue(undefined),
      },
    };

    render(<XEmbeddedPost post={post} shouldLoad widgetsStatus="ready" />);

    expect(await screen.findByText("テスト議員")).toBeVisible();
    expect(screen.getByText("2026年7月27日 09:30")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /この投稿をXで見る/ })
    ).toHaveAttribute("href", post.postUrl);
  });

  it("公式APIのプライバシー設定で埋め込みを生成する", async () => {
    const embeddedPost = document.createElement("iframe");
    const createTweet = vi.fn().mockResolvedValue(embeddedPost);
    window.twttr = { widgets: { createTweet } };

    render(<XEmbeddedPost post={post} shouldLoad widgetsStatus="ready" />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(createTweet).toHaveBeenCalledWith(
      post.postId,
      expect.any(HTMLDivElement),
      {
        align: "center",
        dnt: true,
        lang: "ja",
      }
    );
    expect(
      screen.queryByText("X投稿を読み込んでいます")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("この投稿をXで見る")).not.toBeInTheDocument();
    expect(embeddedPost.style.pointerEvents).toBe("none");
    expect(embeddedPost).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("link", {
        name: "テスト議員の投稿をXでもっと読む",
      })
    ).toHaveAttribute("href", post.postUrl);
  });

  it("後続投稿は指示されるまで公式埋め込みを生成しない", async () => {
    const createTweet = vi
      .fn()
      .mockResolvedValue(document.createElement("blockquote"));
    window.twttr = { widgets: { createTweet } };

    const { rerender } = render(
      <XEmbeddedPost post={post} shouldLoad={false} widgetsStatus="ready" />
    );

    expect(createTweet).not.toHaveBeenCalled();
    expect(screen.getByText("X投稿は移動時に読み込みます")).toBeInTheDocument();

    rerender(<XEmbeddedPost post={post} shouldLoad widgetsStatus="ready" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(createTweet).toHaveBeenCalledTimes(1);
  });

  it("widgets.jsの失敗時はAPIを呼ばずフォールバックする", () => {
    const createTweet = vi.fn();
    window.twttr = { widgets: { createTweet } };

    render(<XEmbeddedPost post={post} shouldLoad widgetsStatus="failed" />);

    expect(createTweet).not.toHaveBeenCalled();
    expect(screen.getByText("この投稿をXで見る")).toBeVisible();
  });

  it("タイムアウト後に埋め込みが遅れて完了してもフォールバックを保つ", async () => {
    vi.useFakeTimers();
    let resolveEmbed: (element: HTMLElement) => void = () => undefined;
    const pendingEmbed = new Promise<HTMLElement>((resolve) => {
      resolveEmbed = resolve;
    });
    window.twttr = {
      widgets: {
        createTweet: vi.fn().mockReturnValue(pendingEmbed),
      },
    };

    render(<XEmbeddedPost post={post} shouldLoad widgetsStatus="ready" />);

    await act(async () => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.getByText("この投稿をXで見る")).toBeVisible();

    await act(async () => {
      resolveEmbed(document.createElement("blockquote"));
      await pendingEmbed;
    });
    expect(screen.getByText("この投稿をXで見る")).toBeVisible();
  });
});
