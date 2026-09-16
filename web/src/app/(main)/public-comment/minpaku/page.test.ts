import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ResolvingMetadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

vi.mock("@/features/public-comment/minpaku/client/public-comment-page", () => ({
  PublicCommentMinpakuPage: () => null,
}));

describe("民泊パブコメの共有画像", () => {
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

  it("親のタイトル・説明を保持し、OGPとXの画像だけを置き換える", async () => {
    const parent = Promise.resolve({ openGraph, twitter }) as ResolvingMetadata;
    const metadata = await generateMetadata({}, parent);
    const image = {
      url: "/minpaku-public-comment-ogp.png",
      width: 1672,
      height: 941,
      alt: "みらい議会＠世田谷 民泊パブコメインタビュー",
    };

    expect(metadata).toEqual({
      openGraph: { ...openGraph, images: [image] },
      twitter: { ...twitter, images: [image] },
    });
    expect(openGraph.images).toEqual([{ url: "/ogp.jpg" }]);
    expect(twitter.images).toEqual([{ url: "/ogp.jpg" }]);
  });

  it("添付されたPNGを加工せず配信する", () => {
    const file = path.resolve(
      __dirname,
      "../../../../../public/minpaku-public-comment-ogp.png"
    );
    expect(
      createHash("sha256").update(fs.readFileSync(file)).digest("hex")
    ).toBe("14bda0d10918b1efcb84f83338e1150fb1ba1ca1e64711b40805be0976f1d73d");
    expect(fs.statSync(file).size).toBeLessThan(5 * 1024 * 1024);
  });
});
