import type { Metadata } from "next";
import { PublicCommentSuicidePreventionPage } from "@/features/public-comment/suicide-prevention/client/public-comment-page";

export const metadata: Metadata = {
  title: "自殺対策計画素案へのAIパブコメインタビュー",
  description:
    "世田谷区自殺対策計画素案を6章の解説とクイズで学び、7つの質問で区への意見を整理します。",
};

export default function Page() {
  return <PublicCommentSuicidePreventionPage />;
}
