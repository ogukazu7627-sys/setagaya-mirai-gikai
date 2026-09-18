import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ResolvingMetadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

vi.mock(
  "@/features/public-comment/elderly-care-plan/client/public-comment-page",
  () => ({ PublicCommentElderlyCarePlanPage: () => null })
);

describe("高齢者保健福祉計画・介護保険事業計画パブコメの共有画像", () => {
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
      url: "/elderly-care-plan-public-comment-ogp.png",
      width: 1731,
      height: 909,
      alt: "みらい議会＠世田谷 高齢者と介護のAIパブコメインタビュー",
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
      "../../../../../public/elderly-care-plan-public-comment-ogp.png"
    );
    expect(
      createHash("sha256").update(fs.readFileSync(file)).digest("hex")
    ).toBe("1ac4360bb540362fc97542050cf6788ad9a352909f066ec72d7750eae6283749");
    expect(fs.statSync(file).size).toBeLessThan(5 * 1024 * 1024);
  });
});
