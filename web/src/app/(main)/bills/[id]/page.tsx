import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { getPublishedBillSeoData } from "@/features/bill-seo/server/loaders/get-published-bill-seo-data";
import {
  buildBillStructuredData,
  serializeJsonLd,
} from "@/features/bill-seo/shared/utils/build-bill-structured-data";
import { BillDetailLayout } from "@/features/bills/server/components/bill-detail/bill-detail-layout";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getPublishedBillRedirectReference } from "@/features/bills/server/loaders/get-published-bill-redirect-reference";
import { getRelatedBillRecommendations } from "@/features/bills/server/loaders/get-related-bill-recommendations";
import { BILL_SEO_SITE_NAME } from "@/features/bills/shared/utils/bill-seo-metadata";
import { getBudgetQuestionCategoryBySlug } from "@/features/budget/shared/constants/budget-question-categories";
import { getGeneralQuestionCategoryById } from "@/features/general-questions/shared/utils/general-question-categories";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";
import { isUuid } from "@/lib/utils/uuid";

interface BillDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: BillDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) {
    return {
      title: "議案が見つかりません",
    };
  }

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
    const description = `${redirectReference.sessionName}で行われた${categoryName}分野の一般質問を、議員ごとに確認できます。`;
    const canonical = routes.generalQuestionCategory(
      redirectReference.year,
      redirectReference.categoryId,
      redirectReference.sessionKey
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

  const seoData = await getPublishedBillSeoData(id);

  if (!seoData) {
    return {
      title: "議案が見つかりません",
    };
  }

  const defaultOgpUrl = new URL("/ogp.jpg", env.webUrl).toString();
  const canonicalPath = routes.billDetail(seoData.billId);

  // シェア用OGP画像（share_thumbnail_url > thumbnail_url > デフォルト）
  // ページ表示用のthumbnail_urlとは別に、SNSシェア用の画像を優先
  const shareImageUrl =
    seoData.shareThumbnailUrl || seoData.thumbnailUrl || defaultOgpUrl;

  return {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: seoData.title,
      description: seoData.description,
      type: "article",
      url: canonicalPath,
      siteName: BILL_SEO_SITE_NAME,
      publishedTime: seoData.publishedAt ?? undefined,
      modifiedTime: seoData.updatedAt,
      images: [
        {
          url: shareImageUrl,
          alt: `${seoData.subjectTitle} のOGPイメージ`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoData.title,
      description: seoData.description,
      images: [shareImageUrl],
    },
  };
}

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

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
        redirectReference.sessionKey,
        id
      ) as Route
    );
  }

  const [billWithContent, currentDifficulty, recommendedBills, seoData] =
    await Promise.all([
      getBillById(id),
      getDifficultyLevel(),
      getRelatedBillRecommendations(id),
      getPublishedBillSeoData(id),
    ]);

  if (!billWithContent) {
    notFound();
  }

  const canonicalUrl = new URL(routes.billDetail(id), env.webUrl).toString();
  const defaultOgpUrl = new URL("/ogp.jpg", env.webUrl).toString();
  const structuredData = seoData
    ? buildBillStructuredData(seoData, {
        canonicalUrl,
        siteUrl: env.webUrl.replace(/\/$/, ""),
        imageUrl:
          seoData.shareThumbnailUrl || seoData.thumbnailUrl || defaultOgpUrl,
      })
    : null;

  return (
    <>
      {structuredData && (
        <script
          id="bill-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(structuredData),
          }}
        />
      )}
      <BillDetailLayout
        bill={billWithContent}
        currentDifficulty={currentDifficulty}
        recommendedBills={recommendedBills}
      />
    </>
  );
}
