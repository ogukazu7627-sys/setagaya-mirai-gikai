import type { Metadata } from "next";
import { PublicCommentGenderEqualityPage } from "@/features/public-comment/gender-equality/client/public-comment-page";

export const metadata: Metadata = {
  title: "第三次男女共同参画プラン素案へのAIパブコメインタビュー",
  description:
    "世田谷区第三次男女共同参画プラン素案を6章の解説とクイズで学び、7つの質問で区への意見を整理します。",
};

export default function Page() {
  return <PublicCommentGenderEqualityPage />;
}
