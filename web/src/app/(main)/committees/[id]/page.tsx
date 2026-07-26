import type { Metadata } from "next";
import { CommitteeDetailPage } from "@/features/committees/server/components/committee-detail-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "委員会詳細 | みらい議会＠世田谷区",
  description:
    "世田谷区議会の委員会が扱うテーマと、実際に審査・調査している案件を確認できます。",
};

type CommitteePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CommitteePage({ params }: CommitteePageProps) {
  const { id } = await params;
  return <CommitteeDetailPage committeeId={id} />;
}
