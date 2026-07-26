import type { Metadata } from "next";
import { LearnPage } from "@/features/learn/server/components/learn-page";

export const metadata: Metadata = {
  title: "学ぶ | みらい議会＠世田谷区",
  description:
    "みらい議会＠世田谷区の見方と、世田谷区議会の公式情報への入口を確認できます。",
};

export default function LearningPage() {
  return <LearnPage />;
}
