import type { PublishedBillSeoData } from "../../server/loaders/get-published-bill-seo-data";

export function buildBillStructuredData(
  data: PublishedBillSeoData,
  input: { canonicalUrl: string; siteUrl: string; imageUrl: string }
) {
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "Article",
      "@id": `${input.canonicalUrl}#article`,
      headline: data.subjectTitle,
      description: data.description,
      mainEntityOfPage: input.canonicalUrl,
      datePublished: data.publishedAt ?? undefined,
      dateModified: data.updatedAt,
      articleSection: data.majorCategory ?? undefined,
      keywords: data.keywords.join("、") || undefined,
      image: input.imageUrl,
      author: {
        "@type": "Organization",
        name: "みらい議会＠世田谷区",
        url: input.siteUrl,
      },
      publisher: {
        "@type": "Organization",
        name: "みらい議会＠世田谷区",
        url: input.siteUrl,
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${input.canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ホーム",
          item: input.siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "議会",
          item: `${input.siteUrl}/bills`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: data.subjectTitle,
          item: input.canonicalUrl,
        },
      ],
    },
  ];

  if (data.faqItems.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${input.canonicalUrl}#faq`,
      mainEntity: data.faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
