import type { Metadata } from "next";
import { CouncilorDetailPage } from "@/features/councilors/server/components/councilor-detail-page";
import { loadCouncilorDetail } from "@/features/councilors/server/loaders/load-councilor-directory";
import { buildCouncilorMetadata } from "@/features/councilors/shared/utils/build-councilor-metadata";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

type CouncilorPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CouncilorPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadCouncilorDetail(id);
  if (!detail) {
    return {
      title: "議員詳細 | みらい議会＠世田谷区",
      description: "議員が公開案件で行った質問や発言を確認できます。",
    };
  }

  const { title, description } = buildCouncilorMetadata({
    displayName: detail.councilor.displayName,
    statementCount: detail.statements.length,
  });
  return {
    title,
    description,
    alternates: { canonical: routes.councilorDetail(id) },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function CouncilorPage({ params }: CouncilorPageProps) {
  const { id } = await params;
  return <CouncilorDetailPage councilorId={id} />;
}
