"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicCouncilorXPost } from "../../shared/types/councilor-x-post";
import { formatXPostDate } from "../../shared/utils/format-x-post-date";

type XWidgetsStatus = "loading" | "ready" | "failed";
type EmbedStatus = "idle" | "loading" | "ready" | "failed";

type XEmbeddedPostProps = {
  post: PublicCouncilorXPost;
  shouldLoad: boolean;
  widgetsStatus: XWidgetsStatus;
};

type XWidgetsApi = {
  createTweet(
    postId: string,
    element: HTMLElement,
    options: {
      align: "center";
      dnt: true;
      lang: "ja";
    }
  ): Promise<HTMLElement | undefined>;
};

declare global {
  interface Window {
    twttr?: {
      widgets: XWidgetsApi;
    };
  }
}

const EMBED_TIMEOUT_MS = 12_000;

function makeEmbedDisplayOnly(element: HTMLElement) {
  element.style.pointerEvents = "none";
  element.tabIndex = -1;

  const iframe = element.querySelector("iframe");
  if (iframe) {
    iframe.style.pointerEvents = "none";
    iframe.tabIndex = -1;
  }
}

export function XEmbeddedPost({
  post,
  shouldLoad,
  widgetsStatus,
}: XEmbeddedPostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus>("idle");

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }
    if (widgetsStatus === "failed") {
      setEmbedStatus("failed");
      return;
    }
    if (widgetsStatus !== "ready") {
      setEmbedStatus("loading");
      return;
    }

    const host = hostRef.current;
    const widgets = window.twttr?.widgets;
    if (!host || !widgets) {
      setEmbedStatus("failed");
      return;
    }

    const target = document.createElement("div");
    let active = true;
    host.replaceChildren(target);
    setEmbedStatus("loading");

    const fail = () => {
      if (!active) {
        return;
      }
      active = false;
      target.remove();
      setEmbedStatus("failed");
    };
    const timeoutId = window.setTimeout(fail, EMBED_TIMEOUT_MS);

    const renderEmbed = async () => {
      try {
        const element = await widgets.createTweet(post.postId, target, {
          align: "center",
          dnt: true,
          lang: "ja",
        });
        if (!active) {
          return;
        }

        window.clearTimeout(timeoutId);
        if (!element) {
          fail();
          return;
        }
        makeEmbedDisplayOnly(element);
        active = false;
        setEmbedStatus("ready");
      } catch {
        window.clearTimeout(timeoutId);
        fail();
      }
    };
    void renderEmbed();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      target.remove();
    };
  }, [post.postId, shouldLoad, widgetsStatus]);

  return (
    <div className="w-full">
      {embedStatus !== "ready" && embedStatus !== "failed" && (
        <div
          className="min-h-[360px] w-full animate-pulse border border-mirai-border bg-white p-5 motion-reduce:animate-none"
          role={shouldLoad ? "status" : undefined}
        >
          <span className="sr-only">
            {shouldLoad
              ? "X投稿を読み込んでいます"
              : "X投稿は移動時に読み込みます"}
          </span>
          <div className="h-4 w-32 rounded-sm bg-mirai-surface-gray" />
          <div className="mt-8 h-3 w-full rounded-sm bg-mirai-surface-gray" />
          <div className="mt-3 h-3 w-4/5 rounded-sm bg-mirai-surface-gray" />
          <div className="mt-3 h-3 w-2/3 rounded-sm bg-mirai-surface-gray" />
        </div>
      )}

      <div className="relative w-full touch-pan-y">
        <div ref={hostRef} className="w-full [&_iframe]:pointer-events-none" />

        {embedStatus === "ready" && (
          <a
            aria-label={`${post.councilorName}の投稿をXでもっと読む`}
            className="absolute right-4 bottom-3 left-4 z-10 h-8 rounded-full focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            draggable={false}
            href={post.postUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span className="sr-only">Xでもっと読む</span>
          </a>
        )}
      </div>

      {embedStatus === "failed" && (
        <article className="min-h-[260px] border border-mirai-border bg-white p-6">
          <p className="text-base font-bold text-mirai-text">
            {post.councilorName}
          </p>
          <time
            dateTime={post.postedAt}
            className="mt-2 block text-sm text-mirai-text-muted"
          >
            {formatXPostDate(post.postedAt)}
          </time>
          <a
            href={post.postUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary underline decoration-1 underline-offset-4"
          >
            この投稿をXで見る
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </article>
      )}
    </div>
  );
}
