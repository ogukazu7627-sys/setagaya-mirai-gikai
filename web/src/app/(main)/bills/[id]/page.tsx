import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDetailLayout } from "@/features/bills/server/components/bill-detail/bill-detail-layout";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getPublishedBillRedirectReference } from "@/features/bills/server/loaders/get-published-bill-redirect-reference";
import { getRandomBillRecommendations } from "@/features/bills/server/loaders/get-random-bill-recommendations";
import {
  BILL_SEO_SITE_NAME,
  buildBillSeoMetadata,
} from "@/features/bills/shared/utils/bill-seo-metadata";
import { getBudgetQuestionCategoryBySlug } from "@/features/budget/shared/constants/budget-question-categories";
import { getGeneralQuestionCategoryById } from "@/features/general-questions/shared/utils/general-question-categories";
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
  const redirectReference = await getPublishedBillRedirectReference(id);

  if (redirectReference?.kind === "budget") {
    const category = getBudgetQuestionCategoryBySlug(
      redirectReference.categorySlug
    );
    const categoryName = category?.name ?? "予算";
    const title = `${categoryName}に関する議員の発言 | 触れる予算`;
    const description = `世田谷区議会で行われた${categoryName}分野の予算質問を、議員ごとに確認できます。`;
    const canonical = routes.budgetQuestionCategory(
      redirectReference.categorySlug
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

  if (redirectReference?.kind === "general_question") {
    const category = getGeneralQuestionCategoryById(
      redirectReference.categoryId
    );
    const categoryName = category?.name ?? "一般質問";
    const title = `${categoryName}に関する議員の質問 | 世田谷区議会`;
    const description = `${redirectReference.year}年の世田谷区議会で行われた${categoryName}分野の一般質問を、議員ごとに確認できます。`;
    const canonical = routes.generalQuestionCategory(
      redirectReference.year,
      redirectReference.categoryId
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
  const redirectReference = await getPublishedBillRedirectReference(id);

  if (redirectReference?.kind === "budget") {
    redirect(
      routes.budgetQuestionCategory(redirectReference.categorySlug, id) as Route
    );
  }

  if (redirectReference?.kind === "general_question") {
    redirect(
      routes.generalQuestionCategory(
        redirectReference.year,
        redirectReference.categoryId,
        id
      ) as Route
    );
  }

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
