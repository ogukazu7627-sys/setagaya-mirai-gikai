import type { Metadata, ResolvingMetadata } from "next";
import { PublicCommentIjimePage } from "@/features/public-comment/ijime/client/public-comment-page";

const title = "いじめ条例素案へのAIパブコメインタビュー";
const description =
  "世田谷区のいじめ予防・解消条例素案について学び、7つの質問で考えを整理し、提出用の意見下書きを作成します。";

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const inherited = await parent;
  const image = {
    url: "/ijime-public-comment-ogp.png",
    width: 1731,
    height: 909,
    alt: "みらい議会＠世田谷 いじめ条例のAIパブコメインタビュー",
  };

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: inherited.openGraph?.siteName ?? undefined,
      images: [image],
    },
    twitter: {
      title,
      description,
      card: "summary_large_image",
      images: [image],
    },
  };
}

export default function IjimePublicCommentPage() {
  return <PublicCommentIjimePage />;
}
