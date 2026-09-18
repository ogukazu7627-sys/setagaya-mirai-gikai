import type { Metadata } from "next";
import { PublicCommentHubPage } from "@/features/public-comment/shared/server/components/public-comment-hub-page";

export const metadata: Metadata = {
  title: "AIパブコメインタビュー | みらい議会＠世田谷区",
  description:
    "AIとの対話で考えを整理し、世田谷区のパブリックコメントに提出する意見の下書きを作成できます。",
  alternates: {
    canonical: "/public-comment",
  },
};

export default function PublicCommentPage() {
  return <PublicCommentHubPage />;
}
