import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDetailLayout } from "@/features/bills/server/components/bill-detail/bill-detail-layout";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getRandomBillRecommendations } from "@/features/bills/server/loaders/get-random-bill-recommendations";
import {
  BILL_SEO_SITE_NAME,
  buildBillSeoMetadata,
} from "@/features/bills/shared/utils/bill-seo-metadata";
import { findPublishedBudgetQuestionReferenceByBillId } from "@/features/budget/server/repositories/budget-question-repository";
import { getBudgetQuestionCategoryBySlug } from "@/features/budget/shared/constants/budget-question-categories";
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
  const [bill, budgetQuestionReference] = await Promise.all([
    getBillById(id),
    findPublishedBudgetQuestionReferenceByBillId(id),
  ]);

  if (budgetQuestionReference) {
    const category = getBudgetQuestionCategoryBySlug(
      budgetQuestionReference.categorySlug
    );
    const categoryName = category?.name ?? "予算";
    const title = `${categoryName}に関する議員の発言 | 触れる予算`;
    const description = `世田谷区議会で行われた${categoryName}分野の予算質問を、議員ごとに確認できます。`;
    const canonical = routes.budgetQuestionCategory(
      budgetQuestionReference.categorySlug
    );
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: "website",
        url: canonical,
        images: ["/ogp.jpg"],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/ogp.jpg"],
      },
    };
  }

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
  const [
    billWithContent,
    currentDifficulty,
    recommendedBills,
    budgetQuestionReference,
  ] = await Promise.all([
    getBillById(id),
    getDifficultyLevel(),
    getRandomBillRecommendations(id),
    findPublishedBudgetQuestionReferenceByBillId(id),
  ]);

  if (budgetQuestionReference) {
    redirect(
      routes.budgetQuestionCategory(
        budgetQuestionReference.categorySlug,
        id
      ) as Route
    );
  }

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
