import type { Metadata } from "next";
import { CouncilorDetailPage } from "@/features/councilors/server/components/councilor-detail-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "議員詳細 | みらい議会＠世田谷区",
  description: "議員が公開案件で行った質問や発言を確認できます。",
};

type CouncilorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CouncilorPage({ params }: CouncilorPageProps) {
  const { id } = await params;
  return <CouncilorDetailPage councilorId={id} />;
}
