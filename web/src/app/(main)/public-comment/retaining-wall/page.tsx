import type { Metadata } from "next";
import { PublicCommentRetainingWallPage } from "@/features/public-comment/retaining-wall/client/public-comment-page";

export const metadata: Metadata = {
  title: "がけ・擁壁等防災対策方針素案へのAIパブコメインタビュー",
  description:
    "世田谷区のがけ・擁壁等防災対策方針素案を6章の解説とクイズで学び、7つの質問で区への意見を整理します。",
};

export default function Page() {
  return <PublicCommentRetainingWallPage />;
}
