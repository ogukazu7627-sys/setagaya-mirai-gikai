import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedBudgetTopicDefinition } from "./budget-topic-definitions";
import { assertSafeBudgetTopicPublishTarget } from "./budget-topic-publish-target";
import {
  type BudgetTopicReviewFile,
  readBudgetTopicReviewFile,
} from "./budget-topic-review";

export interface BudgetTopicPublishExpectation {
  definition: ResolvedBudgetTopicDefinition;
  review: BudgetTopicReviewFile;
}

export interface PublishedBudgetTopicVerificationSnapshot {
  activeDatasetId: string;
  activeIdentityCount: number;
  categories: Array<{ id: string; slug: string; status: string }>;
  topics: Array<{ id: string; slug: string; status: string }>;
  topicCategories: Array<{ topic_id: string; category_id: string }>;
  relations: Array<{
    topic_id: string;
    budget_program_identity_id: string;
    relation_type: string;
    explanation: string;
    evidence_level: string;
    evidence_fields: unknown;
    review_status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
  }>;
}

export interface PublishedBudgetTopicVerificationResult {
  datasetId: string;
  topicCount: number;
  publishedIdentityCount: number;
  publishedRelationCount: number;
  rejectedRelationCount: number;
}

type AdminClient = SupabaseClient;
const RELATION_PAGE_SIZE = 1_000;

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です`);
  }
  return value;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function requireExactlyOne<T>(rows: T[], description: string): T {
  if (rows.length !== 1) {
    throw new Error(`${description}が一意ではありません: ${rows.length}件`);
  }
  return rows[0] as T;
}

export function loadBudgetTopicPublishExpectations(
  definitions: ResolvedBudgetTopicDefinition[],
  reviewDirectory: string
): BudgetTopicPublishExpectation[] {
  return definitions.map((definition) => {
    const reviewPath = path.join(reviewDirectory, definition.topic.reviewFile);
    if (!fs.existsSync(reviewPath)) {
      throw new Error(`review CSVがありません: ${reviewPath}`);
    }
    const review = readBudgetTopicReviewFile(reviewPath);
    if (review.candidateTopicName !== definition.topic.name) {
      throw new Error(
        `review CSVのtopic名が定義と一致しません: ${definition.topic.reviewFile}`
      );
    }
    if (review.pendingRows.length > 0) {
      throw new Error(
        `${definition.topic.slug} に未判断が${review.pendingRows.length}件あります`
      );
    }
    if (review.selectedRows.length === 0) {
      throw new Error(`${definition.topic.slug} に公開対象がありません`);
    }
    return { definition, review };
  });
}

export function assertPublishedBudgetTopicsMatchReviews(
  expectations: BudgetTopicPublishExpectation[],
  snapshot: PublishedBudgetTopicVerificationSnapshot
): PublishedBudgetTopicVerificationResult {
  let publishedRelationCount = 0;
  let rejectedRelationCount = 0;

  for (const { definition, review } of expectations) {
    const topic = requireExactlyOne(
      snapshot.topics.filter((row) => row.slug === definition.topic.slug),
      `published topic ${definition.topic.slug}`
    );
    if (topic.status !== "published") {
      throw new Error(`${definition.topic.slug} がpublishedではありません`);
    }

    const category = requireExactlyOne(
      snapshot.categories.filter((row) => row.slug === definition.categorySlug),
      `published category ${definition.categorySlug}`
    );
    if (category.status !== "published") {
      throw new Error(`${definition.categorySlug} がpublishedではありません`);
    }
    if (
      !snapshot.topicCategories.some(
        (relation) =>
          relation.topic_id === topic.id && relation.category_id === category.id
      )
    ) {
      throw new Error(
        `${definition.topic.slug} と ${definition.categorySlug} の関係がありません`
      );
    }

    const actualRelations = snapshot.relations.filter(
      (relation) => relation.topic_id === topic.id
    );
    const actualByIdentityId = new Map(
      actualRelations.map((relation) => [
        relation.budget_program_identity_id,
        relation,
      ])
    );
    if (actualByIdentityId.size !== actualRelations.length) {
      throw new Error(`${definition.topic.slug} の公開関係が重複しています`);
    }
    if (actualRelations.length !== review.selectedRows.length) {
      throw new Error(
        `${definition.topic.slug} の公開件数が不一致です: expected=${review.selectedRows.length}, actual=${actualRelations.length}`
      );
    }

    for (const expected of review.selectedRows) {
      const actual = actualByIdentityId.get(
        expected.budget_program_identity_id
      );
      if (!actual) {
        throw new Error(
          `${definition.topic.slug} に承認済みidentityがありません: ${expected.budget_program_identity_id}`
        );
      }
      if (
        actual.review_status !== "published" ||
        actual.relation_type !== expected.proposed_relation_type ||
        actual.explanation !== expected.proposed_explanation ||
        actual.evidence_level !== expected.evidence_level ||
        canonicalJson(actual.evidence_fields) !==
          canonicalJson(expected.evidence_fields) ||
        !actual.reviewed_by ||
        !actual.reviewed_at
      ) {
        throw new Error(
          `${definition.topic.slug} の公開内容がreview CSVと一致しません: ${expected.budget_program_identity_id}`
        );
      }
    }

    for (const rejected of review.rejectedRows) {
      if (actualByIdentityId.has(rejected.budget_program_identity_id)) {
        throw new Error(
          `${definition.topic.slug} にreject済みidentityが残っています: ${rejected.budget_program_identity_id}`
        );
      }
    }

    publishedRelationCount += actualRelations.length;
    rejectedRelationCount += review.rejectedRows.length;
  }

  const publishedIdentityCount = new Set(
    snapshot.relations.map((relation) => relation.budget_program_identity_id)
  ).size;
  if (publishedIdentityCount !== snapshot.activeIdentityCount) {
    throw new Error(
      `公開topicで到達できるidentity件数がactive datasetと一致しません: expected=${snapshot.activeIdentityCount}, actual=${publishedIdentityCount}`
    );
  }

  return {
    datasetId: snapshot.activeDatasetId,
    topicCount: expectations.length,
    publishedIdentityCount,
    publishedRelationCount,
    rejectedRelationCount,
  };
}

async function fetchAllPublishedTopicRelations(
  adminClient: AdminClient,
  datasetId: string,
  topicIds: string[]
): Promise<PublishedBudgetTopicVerificationSnapshot["relations"]> {
  if (topicIds.length === 0) {
    return [];
  }

  const relations: PublishedBudgetTopicVerificationSnapshot["relations"] = [];
  for (let offset = 0; ; offset += RELATION_PAGE_SIZE) {
    const response = await adminClient
      .from("budget_topic_programs")
      .select(
        "topic_id,budget_program_identity_id,relation_type,explanation,evidence_level,evidence_fields,review_status,reviewed_by,reviewed_at"
      )
      .eq("dataset_id", datasetId)
      .in("topic_id", topicIds)
      .order("topic_id", { ascending: true })
      .order("budget_program_identity_id", { ascending: true })
      .range(offset, offset + RELATION_PAGE_SIZE - 1);
    if (response.error) {
      throw new Error(
        `公開topic関係の取得に失敗しました: ${response.error.message}`
      );
    }
    const page = response.data ?? [];
    relations.push(...page);
    if (page.length < RELATION_PAGE_SIZE) {
      return relations;
    }
  }
}

export async function fetchPublishedBudgetTopicVerificationSnapshot(
  expectations: BudgetTopicPublishExpectation[],
  client?: AdminClient
): Promise<PublishedBudgetTopicVerificationSnapshot> {
  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  requireEnvironment("SUPABASE_SECRET_KEY");
  assertSafeBudgetTopicPublishTarget({
    supabaseUrl,
    environmentName: process.env.BUDGET_IMPORT_ENVIRONMENT,
    productionConfirmation: process.env.BUDGET_TOPIC_PUBLISH_CONFIRMATION,
    githubActions: process.env.GITHUB_ACTIONS,
    githubRefName: process.env.GITHUB_REF_NAME,
    githubEventName: process.env.GITHUB_EVENT_NAME,
  });

  const adminClient = client ?? (createAdminClient() as AdminClient);
  const activeDataset = await adminClient
    .from("budget_datasets")
    .select("id")
    .eq("fiscal_year", 2026)
    .eq("budget_type", "initial_budget")
    .eq("status", "active")
    .limit(2);
  if (activeDataset.error) {
    throw new Error(
      `active datasetの取得に失敗しました: ${activeDataset.error.message}`
    );
  }
  const dataset = requireExactlyOne(
    activeDataset.data ?? [],
    "令和8年度当初予算のactive dataset"
  );

  const topicSlugs = expectations.map(
    ({ definition }) => definition.topic.slug
  );
  const categorySlugs = [
    ...new Set(expectations.map(({ definition }) => definition.categorySlug)),
  ];
  const [categories, topics] = await Promise.all([
    adminClient
      .from("budget_categories")
      .select("id,slug,status")
      .in("slug", categorySlugs),
    adminClient
      .from("budget_topics")
      .select("id,slug,status")
      .in("slug", topicSlugs),
  ]);
  if (categories.error || topics.error) {
    throw new Error(
      `公開topicメタデータの取得に失敗しました: ${
        categories.error?.message ?? topics.error?.message
      }`
    );
  }

  const topicIds = (topics.data ?? []).map((topic) => topic.id);
  const [topicCategories, activeIdentities] = await Promise.all([
    topicIds.length > 0
      ? adminClient
          .from("budget_topic_categories")
          .select("topic_id,category_id")
          .in("topic_id", topicIds)
      : Promise.resolve({ data: [], error: null }),
    adminClient
      .from("budget_program_identities")
      .select("budget_program_identity_id", { count: "exact", head: true })
      .eq("dataset_id", dataset.id),
  ]);
  if (topicCategories.error || activeIdentities.error) {
    throw new Error(
      `公開topic検証データの取得に失敗しました: ${
        topicCategories.error?.message ?? activeIdentities.error?.message
      }`
    );
  }
  if (activeIdentities.count === null) {
    throw new Error("active datasetのidentity件数を取得できませんでした");
  }
  const relations = await fetchAllPublishedTopicRelations(
    adminClient,
    dataset.id,
    topicIds
  );

  return {
    activeDatasetId: dataset.id,
    activeIdentityCount: activeIdentities.count,
    categories: categories.data ?? [],
    topics: topics.data ?? [],
    topicCategories: topicCategories.data ?? [],
    relations,
  };
}

export async function verifyReviewedBudgetTopics(
  expectations: BudgetTopicPublishExpectation[],
  client?: AdminClient
): Promise<PublishedBudgetTopicVerificationResult> {
  const snapshot = await fetchPublishedBudgetTopicVerificationSnapshot(
    expectations,
    client
  );
  return assertPublishedBudgetTopicsMatchReviews(expectations, snapshot);
}
