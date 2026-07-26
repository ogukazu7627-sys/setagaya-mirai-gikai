import type { Metadata } from "next";
import { LearnPage } from "@/features/learn/server/components/learn-page";

export const metadata: Metadata = {
  title: "学ぶ | みらい議会＠世田谷区",
  description:
    "区議会の役割、議案の流れ、委員会、予算、請願・陳情など、世田谷区議会のしくみをやさしく学べます。",
  alternates: {
    canonical: "/learn",
  },
};

export default function LearningPage() {
  return <LearnPage />;
}
