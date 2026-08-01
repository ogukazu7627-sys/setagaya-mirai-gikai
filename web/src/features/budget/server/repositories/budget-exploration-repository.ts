import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import {
  BUDGET_PUBLIC_BUDGET_TYPE,
  BUDGET_PUBLIC_FISCAL_YEAR,
} from "../../shared/constants/budget";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type BudgetExplorationCategoryRow = Pick<
  TableRow<"budget_categories">,
  "id" | "slug" | "name" | "short_description" | "sort_order" | "status"
>;

export type BudgetExplorationTopicRow = Pick<
  TableRow<"budget_topics">,
  "id" | "slug" | "name" | "short_description" | "topic_kind" | "status"
>;

export type BudgetExplorationTopicCategoryRow = Pick<
  TableRow<"budget_topic_categories">,
  "topic_id" | "category_id" | "relevance_weight" | "is_primary"
>;

export type BudgetExplorationTopicProgramRow = Pick<
  TableRow<"budget_topic_programs">,
  | "topic_id"
  | "dataset_id"
  | "budget_program_identity_id"
  | "relation_type"
  | "review_status"
>;

export type BudgetExplorationIdentityRow = Pick<
  TableRow<"budget_program_identities">,
  | "budget_program_identity_id"
  | "account_code"
  | "account_name"
  | "kan_name"
  | "kou_name"
  | "moku_name"
  | "display_program_name"
  | "department_display_name"
  | "amount_thousand_yen"
  | "is_zero_amount"
>;

export type BudgetExplorationDatasetRow = Pick<
  TableRow<"budget_datasets">,
  | "id"
  | "fiscal_year"
  | "budget_type"
  | "schema_version"
  | "currency_unit"
  | "validation_status"
>;

export interface BudgetExplorationRows {
  activeDataset: BudgetExplorationDatasetRow | null;
  categories: BudgetExplorationCategoryRow[];
  topics: BudgetExplorationTopicRow[];
  topicCategories: BudgetExplorationTopicCategoryRow[];
  topicPrograms: BudgetExplorationTopicProgramRow[];
  identities: BudgetExplorationIdentityRow[];
}

const IDENTITY_QUERY_CHUNK_SIZE = 100;

export async function findPublishedBudgetExplorationRows(): Promise<BudgetExplorationRows> {
  const supabase = createAdminClient();
  const [datasetResult, categoriesResult, topicsResult] = await Promise.all([
    supabase
      .from("budget_datasets")
      .select(
        "id,fiscal_year,budget_type,schema_version,currency_unit,validation_status"
      )
      .eq("fiscal_year", BUDGET_PUBLIC_FISCAL_YEAR)
      .eq("budget_type", BUDGET_PUBLIC_BUDGET_TYPE)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("budget_categories")
      .select("id,slug,name,short_description,sort_order,status")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("budget_topics")
      .select("id,slug,name,short_description,topic_kind,status")
      .eq("status", "published")
      .order("name", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (datasetResult.error || categoriesResult.error || topicsResult.error) {
    throw new Error("Failed to fetch budget exploration metadata");
  }

  const activeDataset = datasetResult.data ?? null;
  const activeDatasetId = activeDataset?.id ?? null;
  const categories = categoriesResult.data ?? [];
  const topics = topicsResult.data ?? [];
  const publishedCategoryIds = categories.map((category) => category.id);
  const publishedTopicIds = topics.map((topic) => topic.id);

  if (
    activeDataset === null ||
    publishedCategoryIds.length === 0 ||
    publishedTopicIds.length === 0
  ) {
    return {
      activeDataset,
      categories,
      topics,
      topicCategories: [],
      topicPrograms: [],
      identities: [],
    };
  }

  const topicCategoryQuery = supabase
    .from("budget_topic_categories")
    .select("topic_id,category_id,relevance_weight,is_primary")
    .in("topic_id", publishedTopicIds)
    .in("category_id", publishedCategoryIds)
    .order("topic_id", { ascending: true })
    .order("category_id", { ascending: true });

  const [topicCategoriesResult, topicProgramsResult] = await Promise.all([
    topicCategoryQuery,
    activeDatasetId
      ? supabase
          .from("budget_topic_programs")
          .select(
            "topic_id,dataset_id,budget_program_identity_id,relation_type,review_status"
          )
          .eq("dataset_id", activeDatasetId)
          .eq("review_status", "published")
          .in("topic_id", publishedTopicIds)
          .order("topic_id", { ascending: true })
          .order("budget_program_identity_id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (topicCategoriesResult.error || topicProgramsResult.error) {
    throw new Error("Failed to fetch published budget exploration relations");
  }

  const topicPrograms = topicProgramsResult.data ?? [];
  const identityIds = [
    ...new Set(
      topicPrograms.map((relation) => relation.budget_program_identity_id)
    ),
  ].sort();
  const identities = activeDatasetId
    ? await findExplorationIdentities(supabase, activeDatasetId, identityIds)
    : [];

  return {
    activeDataset,
    categories,
    topics,
    topicCategories: topicCategoriesResult.data ?? [],
    topicPrograms,
    identities,
  };
}

async function findExplorationIdentities(
  supabase: ReturnType<typeof createAdminClient>,
  datasetId: string,
  identityIds: string[]
): Promise<BudgetExplorationIdentityRow[]> {
  if (identityIds.length === 0) {
    return [];
  }

  const chunks = Array.from(
    { length: Math.ceil(identityIds.length / IDENTITY_QUERY_CHUNK_SIZE) },
    (_, index) =>
      identityIds.slice(
        index * IDENTITY_QUERY_CHUNK_SIZE,
        (index + 1) * IDENTITY_QUERY_CHUNK_SIZE
      )
  );
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("budget_program_identities")
        .select(
          "budget_program_identity_id,account_code,account_name,kan_name,kou_name,moku_name,display_program_name,department_display_name,amount_thousand_yen,is_zero_amount"
        )
        .eq("dataset_id", datasetId)
        .in("budget_program_identity_id", chunk)
        .order("budget_program_identity_id", { ascending: true })
    )
  );

  if (results.some((result) => result.error)) {
    throw new Error("Failed to fetch budget exploration programs");
  }

  return results.flatMap((result) => result.data ?? []);
}
