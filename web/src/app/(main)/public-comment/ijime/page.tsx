import type { Metadata } from "next";
import { PublicCommentIjimePage } from "@/features/public-comment/ijime/client/public-comment-page";

export const metadata: Metadata = {
  title: "いじめ条例素案へのAIパブコメインタビュー",
  description:
    "世田谷区のいじめ予防・解消条例素案について学び、7つの質問で考えを整理し、提出用の意見下書きを作成します。",
};

export default function IjimePublicCommentPage() {
  return <PublicCommentIjimePage />;
}
