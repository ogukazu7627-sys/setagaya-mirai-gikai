import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDetailLayout } from "@/features/bills/server/components/bill-detail/bill-detail-layout";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getRandomBillRecommendations } from "@/features/bills/server/loaders/get-random-bill-recommendations";
import {
  BILL_SEO_SITE_NAME,
  buildBillSeoMetadata,
} from "@/features/bills/shared/utils/bill-seo-metadata";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

interface BillDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: BillDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const bill = await getBillById(id);

  if (!bill) {
    return {
      title: "議案が見つかりません",
    };
  }

  const seoMetadata = buildBillSeoMetadata(bill);
  const defaultOgpUrl = new URL("/ogp.jpg", env.webUrl).toString();
  const canonicalPath = routes.billDetail(bill.id);

  // シェア用OGP画像（share_thumbnail_url > thumbnail_url > デフォルト）
  // ページ表示用のthumbnail_urlとは別に、SNSシェア用の画像を優先
  const shareImageUrl =
    bill.share_thumbnail_url || bill.thumbnail_url || defaultOgpUrl;

  return {
    title: seoMetadata.title,
    description: seoMetadata.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: seoMetadata.title,
      description: seoMetadata.description,
      type: "article",
      url: canonicalPath,
      siteName: BILL_SEO_SITE_NAME,
      publishedTime: bill.published_at ?? undefined,
      modifiedTime: bill.updated_at,
      images: [
        {
          url: shareImageUrl,
          alt: `${seoMetadata.subjectTitle} のOGPイメージ`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoMetadata.title,
      description: seoMetadata.description,
      images: [shareImageUrl],
    },
  };
}

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { id } = await params;
  const [billWithContent, currentDifficulty, recommendedBills] =
    await Promise.all([
      getBillById(id),
      getDifficultyLevel(),
      getRandomBillRecommendations(id),
    ]);

  if (!billWithContent) {
    notFound();
  }

  return (
    <BillDetailLayout
      bill={billWithContent}
      currentDifficulty={currentDifficulty}
      recommendedBills={recommendedBills}
    />
  );
}
