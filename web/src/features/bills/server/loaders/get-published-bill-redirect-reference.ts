import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getBudgetQuestionCategoryByMajorCategory } from "@/features/budget/shared/constants/budget-question-categories";
import { getGeneralQuestionCategoryByMajorCategory } from "@/features/general-questions/shared/utils/general-question-categories";
import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { isUuid } from "@/lib/utils/uuid";

type PublishedBillRedirectReference =
  | { kind: "budget"; categorySlug: string }
  | {
      kind: "general_question";
      categoryId: RecommendationCategoryId;
      year: number;
    };

type PublishedBillRedirectRow = {
  publication_category: string | null;
  major_category: string | null;
  diet_session: { start_date: string } | Array<{ start_date: string }> | null;
};

async function fetchPublishedBillRedirectReference(
  billId: string
): Promise<PublishedBillRedirectReference | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      "publication_category, major_category, diet_session:diet_sessions(start_date)"
    )
    .eq("id", billId)
    .eq("publish_status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch published bill redirect reference: ${error.message}`
    );
  }

  const row = data as PublishedBillRedirectRow | null;
  if (row?.publication_category === "budget") {
    const category = getBudgetQuestionCategoryByMajorCategory(
      row.major_category
    );
    return category ? { kind: "budget", categorySlug: category.slug } : null;
  }

  if (row?.publication_category !== "general_question") {
    return null;
  }

  const category = getGeneralQuestionCategoryByMajorCategory(
    row.major_category
  );
  const relation = row.diet_session;
  const session = Array.isArray(relation) ? relation[0] : relation;
  const yearMatch = session?.start_date.match(/^(\d{4})/u);
  if (!category || !yearMatch) {
    return null;
  }

  return {
    kind: "general_question",
    categoryId: category.id,
    year: Number(yearMatch[1]),
  };
}

const getCachedPublishedBillRedirectReference = unstable_cache(
  fetchPublishedBillRedirectReference,
  ["published-bill-redirect-reference"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.BILLS],
  }
);

export const getPublishedBillRedirectReference = cache(
  (billId: string): Promise<PublishedBillRedirectReference | null> => {
    if (isSetagayaMockMode || !isUuid(billId)) {
      return Promise.resolve(null);
    }
    return getCachedPublishedBillRedirectReference(billId);
  }
);
