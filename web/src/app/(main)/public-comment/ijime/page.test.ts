import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ResolvingMetadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

vi.mock("@/features/public-comment/ijime/client/public-comment-page", () => ({
  PublicCommentIjimePage: () => null,
}));

describe("いじめ条例パブコメの共有画像", () => {
  const openGraph = {
    title: { absolute: "みらい議会＠世田谷区", template: null },
    description: "世田谷区議会の情報整理サイト",
    siteName: "みらい議会＠世田谷区",
    images: [{ url: "/ogp.jpg" }],
  };
  const twitter = {
    card: "summary_large_image" as const,
    title: openGraph.title,
    description: openGraph.description,
    images: [{ url: "/ogp.jpg" }],
  };

  it("ページ固有の文言と画像をOGPとXカードに設定する", async () => {
    const parent = Promise.resolve({ openGraph, twitter }) as ResolvingMetadata;
    const metadata = await generateMetadata({}, parent);
    const title = "いじめ条例素案へのAIパブコメインタビュー";
    const description =
      "世田谷区のいじめ予防・解消条例素案について学び、7つの質問で考えを整理し、提出用の意見下書きを作成します。";
    const image = {
      url: "/ijime-public-comment-ogp.png",
      width: 1731,
      height: 909,
      alt: "みらい議会＠世田谷 いじめ条例のAIパブコメインタビュー",
    };

    expect(metadata).toEqual({
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: openGraph.siteName,
        images: [image],
      },
      twitter: {
        title,
        description,
        card: "summary_large_image",
        images: [image],
      },
    });
  });

  it("添付されたPNGを加工せず配信する", () => {
    const file = path.resolve(
      __dirname,
      "../../../../../public/ijime-public-comment-ogp.png"
    );
    expect(
      createHash("sha256").update(fs.readFileSync(file)).digest("hex")
    ).toBe("3b107d68dd727ab5a41bfb1eeadecc1f05a823682ba8efc682d21e89a257b563");
    expect(fs.statSync(file).size).toBeLessThan(5 * 1024 * 1024);
  });
});
