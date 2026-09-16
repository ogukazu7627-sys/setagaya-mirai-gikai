import type { Metadata, ResolvingMetadata } from "next";
import { PublicCommentMinpakuPage } from "@/features/public-comment/minpaku/client/public-comment-page";

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const inherited = await parent;
  const image = {
    url: "/minpaku-public-comment-ogp.png",
    width: 1672,
    height: 941,
    alt: "みらい議会＠世田谷 民泊パブコメインタビュー",
  };

  return {
    openGraph: {
      title: inherited.openGraph?.title ?? undefined,
      description: inherited.openGraph?.description ?? undefined,
      siteName: inherited.openGraph?.siteName ?? undefined,
      images: [image],
    },
    twitter: {
      title: inherited.twitter?.title ?? undefined,
      description: inherited.twitter?.description ?? undefined,
      card: "summary_large_image",
      images: [image],
    },
  };
}

export default function MinpakuPublicCommentPage() {
  return <PublicCommentMinpakuPage />;
}
