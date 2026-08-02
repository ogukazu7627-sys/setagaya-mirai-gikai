import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { ResolvedBudgetTopicDefinition } from "./budget-topic-definitions";
import {
  type BudgetTopicReviewFile,
  readBudgetTopicReviewFile,
} from "./budget-topic-review";
import { assertSafeBudgetImportTarget } from "./import-public-budget";
import type { PublicBudgetDataset } from "./read-public-budget-files";

export interface PublishedBudgetTopicRelationSnapshot {
  topicSlug: string;
  categorySlugs: string[];
  budgetProgramIdentityId: string;
  evidenceLevel: "B_strong_structural" | "C_editorial";
}

export interface PublishedBudgetTopicSnapshot {
  sourceEnvironment: "local" | "validation";
  activeDatasetId: string;
  manifestSha256: string;
  publishedTopicSlugs: string[];
  relations: PublishedBudgetTopicRelationSnapshot[];
}

export interface BudgetTopicMetric {
  categorySlug: string;
  categoryName: string;
  topicSlug: string;
  topicName: string;
  candidateCount: number;
  evidenceBCount: number;
  evidenceCCount: number;
  approveCount: number;
  reviseCount: number;
  rejectCount: number;
  pendingCount: number;
  publishedProgramCount: number;
  published: boolean;
}

export interface BudgetTopicCategoryMetric {
  categorySlug: string;
  categoryName: string;
  topicCount: number;
  candidateCount: number;
  evidenceBCount: number;
  evidenceCCount: number;
  reviewPendingCount: number;
  reviewedApproveOrReviseCount: number;
  publishedProgramCount: number;
}

export interface BudgetTopicWorkflowMetrics {
  totalIdentityCount: number;
  topicDefinitionCount: number;
  candidateIdentityCount: number;
  publishedIdentityCount: number;
  unclassifiedIdentityCount: number;
  evidenceBCount: number;
  evidenceCCount: number;
  reviewPendingCount: number;
  reviewedApproveOrReviseCount: number;
  publishedRelationCount: number;
  categories: BudgetTopicCategoryMetric[];
  topics: BudgetTopicMetric[];
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です`);
  }
  return value;
}

export async function fetchPublishedBudgetTopicSnapshot(): Promise<PublishedBudgetTopicSnapshot> {
  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  requireEnvironment("SUPABASE_SECRET_KEY");
  assertSafeBudgetImportTarget({
    supabaseUrl,
    environmentName: process.env.BUDGET_IMPORT_ENVIRONMENT,
  });
  const client = createAdminClient();
  const dataset = await client
    .from("budget_datasets")
    .select("id,manifest_sha256")
    .eq("fiscal_year", 2026)
    .eq("budget_type", "initial_budget")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (dataset.error) {
    throw new Error(
      `active datasetの取得に失敗しました: ${dataset.error.message}`
    );
  }
  if (!dataset.data) {
    throw new Error("令和8年度当初予算のactive datasetがありません");
  }

  const [categories, topics, topicCategories, topicPrograms] =
    await Promise.all([
      client
        .from("budget_categories")
        .select("id,slug")
        .eq("status", "published"),
      client.from("budget_topics").select("id,slug").eq("status", "published"),
      client.from("budget_topic_categories").select("topic_id,category_id"),
      client
        .from("budget_topic_programs")
        .select(
          "topic_id,budget_program_identity_id,evidence_level,review_status"
        )
        .eq("dataset_id", dataset.data.id)
        .eq("review_status", "published"),
    ]);
  const firstError = [categories, topics, topicCategories, topicPrograms].find(
    (result) => result.error
  )?.error;
  if (firstError) {
    throw new Error(`公開topic状態の取得に失敗しました: ${firstError.message}`);
  }

  const categorySlugById = new Map(
    (categories.data ?? []).map((category) => [category.id, category.slug])
  );
  const topicSlugById = new Map(
    (topics.data ?? []).map((topic) => [topic.id, topic.slug])
  );
  const categorySlugsByTopicId = new Map<string, string[]>();
  for (const relation of topicCategories.data ?? []) {
    const categorySlug = categorySlugById.get(relation.category_id);
    if (!categorySlug || !topicSlugById.has(relation.topic_id)) {
      continue;
    }
    const slugs = categorySlugsByTopicId.get(relation.topic_id) ?? [];
    slugs.push(categorySlug);
    categorySlugsByTopicId.set(relation.topic_id, slugs);
  }

  const relations = (topicPrograms.data ?? []).flatMap((relation) => {
    const topicSlug = topicSlugById.get(relation.topic_id);
    if (
      !topicSlug ||
      (relation.evidence_level !== "B_strong_structural" &&
        relation.evidence_level !== "C_editorial")
    ) {
      return [];
    }
    const evidenceLevel = relation.evidence_level as
      | "B_strong_structural"
      | "C_editorial";
    return [
      {
        topicSlug,
        categorySlugs: [
          ...(categorySlugsByTopicId.get(relation.topic_id) ?? []),
        ].sort(),
        budgetProgramIdentityId: relation.budget_program_identity_id,
        evidenceLevel,
      },
    ];
  });

  return {
    sourceEnvironment:
      process.env.BUDGET_IMPORT_ENVIRONMENT === "validation"
        ? "validation"
        : "local",
    activeDatasetId: dataset.data.id,
    manifestSha256: dataset.data.manifest_sha256,
    publishedTopicSlugs: [...topicSlugById.values()].sort(),
    relations: relations.sort(
      (left, right) =>
        left.topicSlug.localeCompare(right.topicSlug) ||
        left.budgetProgramIdentityId.localeCompare(
          right.budgetProgramIdentityId
        )
    ),
  };
}

export function readBudgetTopicReviewFiles(
  definitions: ResolvedBudgetTopicDefinition[],
  reviewDirectory: string
): Map<string, BudgetTopicReviewFile> {
  return new Map(
    definitions.map((definition) => {
      const reviewPath = path.join(
        reviewDirectory,
        definition.topic.reviewFile
      );
      if (!fs.existsSync(reviewPath)) {
        throw new Error(`review CSVがありません: ${reviewPath}`);
      }
      const reviewFile = readBudgetTopicReviewFile(reviewPath);
      if (reviewFile.candidateTopicName !== definition.topic.name) {
        throw new Error(
          `review CSVのtopic名が定義と一致しません: ${definition.topic.reviewFile}`
        );
      }
      return [definition.topic.slug, reviewFile];
    })
  );
}

export function buildBudgetTopicWorkflowMetrics(
  dataset: PublicBudgetDataset,
  definitions: ResolvedBudgetTopicDefinition[],
  reviewFiles: Map<string, BudgetTopicReviewFile>,
  published: PublishedBudgetTopicSnapshot
): BudgetTopicWorkflowMetrics {
  if (published.manifestSha256 !== dataset.manifestSha256) {
    throw new Error(
      "active datasetと入力公開データのmanifest hashが一致しません"
    );
  }
  const identityIds = new Set(
    dataset.programIdentities.map(
      (identity) => identity.budget_program_identity_id
    )
  );
  const missingPublishedIdentityIds = published.relations
    .map((relation) => relation.budgetProgramIdentityId)
    .filter((identityId) => !identityIds.has(identityId));
  if (missingPublishedIdentityIds.length > 0) {
    throw new Error(
      `公開関係が入力データにないidentityを参照しています: ${missingPublishedIdentityIds.join(", ")}`
    );
  }

  const publishedTopicSlugs = new Set(published.publishedTopicSlugs);
  const topics = definitions.map((definition) => {
    const review = reviewFiles.get(definition.topic.slug);
    if (!review) {
      throw new Error(`review CSVが未読込です: ${definition.topic.slug}`);
    }
    const topicRelations = published.relations.filter(
      (relation) => relation.topicSlug === definition.topic.slug
    );
    return {
      categorySlug: definition.categorySlug,
      categoryName: definition.categoryName,
      topicSlug: definition.topic.slug,
      topicName: definition.topic.name,
      candidateCount: review.rows.length,
      evidenceBCount: review.rows.filter(
        (row) => row.evidence_level === "B_strong_structural"
      ).length,
      evidenceCCount: review.rows.filter(
        (row) => row.evidence_level === "C_editorial"
      ).length,
      approveCount: review.decisionCounts.approve,
      reviseCount: review.decisionCounts.revise,
      rejectCount: review.decisionCounts.reject,
      pendingCount: review.decisionCounts[""],
      publishedProgramCount: topicRelations.length,
      published: publishedTopicSlugs.has(definition.topic.slug),
    };
  });

  const categoryPairs = new Map<string, BudgetTopicMetric[]>();
  for (const topic of topics) {
    const categoryTopics = categoryPairs.get(topic.categorySlug) ?? [];
    categoryTopics.push(topic);
    categoryPairs.set(topic.categorySlug, categoryTopics);
  }
  const categories = [...categoryPairs.entries()].map(
    ([categorySlug, categoryTopics]) => ({
      categorySlug,
      categoryName: categoryTopics[0]?.categoryName ?? categorySlug,
      topicCount: categoryTopics.length,
      candidateCount: categoryTopics.reduce(
        (total, topic) => total + topic.candidateCount,
        0
      ),
      evidenceBCount: categoryTopics.reduce(
        (total, topic) => total + topic.evidenceBCount,
        0
      ),
      evidenceCCount: categoryTopics.reduce(
        (total, topic) => total + topic.evidenceCCount,
        0
      ),
      reviewPendingCount: categoryTopics.reduce(
        (total, topic) => total + topic.pendingCount,
        0
      ),
      reviewedApproveOrReviseCount: categoryTopics.reduce(
        (total, topic) => total + topic.approveCount + topic.reviseCount,
        0
      ),
      publishedProgramCount: categoryTopics.reduce(
        (total, topic) => total + topic.publishedProgramCount,
        0
      ),
    })
  );

  const candidateIdentityIds = new Set(
    [...reviewFiles.values()].flatMap((review) =>
      review.rows.map((row) => row.budget_program_identity_id)
    )
  );
  const publishedIdentityIds = new Set(
    published.relations.map((relation) => relation.budgetProgramIdentityId)
  );

  return {
    totalIdentityCount: identityIds.size,
    topicDefinitionCount: definitions.length,
    candidateIdentityCount: candidateIdentityIds.size,
    publishedIdentityCount: publishedIdentityIds.size,
    unclassifiedIdentityCount: identityIds.size - publishedIdentityIds.size,
    evidenceBCount: topics.reduce(
      (total, topic) => total + topic.evidenceBCount,
      0
    ),
    evidenceCCount: topics.reduce(
      (total, topic) => total + topic.evidenceCCount,
      0
    ),
    reviewPendingCount: topics.reduce(
      (total, topic) => total + topic.pendingCount,
      0
    ),
    reviewedApproveOrReviseCount: topics.reduce(
      (total, topic) => total + topic.approveCount + topic.reviseCount,
      0
    ),
    publishedRelationCount: published.relations.length,
    categories,
    topics,
  };
}

export function renderBudgetTopicWorkflowReport(
  metrics: BudgetTopicWorkflowMetrics,
  snapshot: PublishedBudgetTopicSnapshot
): string {
  const categoryRows = metrics.categories
    .map(
      (category) =>
        `| ${category.categoryName} | ${category.topicCount} | ${category.candidateCount} | ${category.evidenceBCount} | ${category.evidenceCCount} | ${category.reviewPendingCount} | ${category.reviewedApproveOrReviseCount} | ${category.publishedProgramCount} |`
    )
    .join("\n");
  const topicRows = metrics.topics
    .map(
      (topic) =>
        `| ${topic.categoryName} | ${topic.topicName} | ${topic.candidateCount} | ${topic.evidenceBCount} | ${topic.evidenceCCount} | ${topic.approveCount + topic.reviseCount} | ${topic.rejectCount} | ${topic.pendingCount} | ${topic.publishedProgramCount} | ${topic.published ? "published" : "not_published"} |`
    )
    .join("\n");

  return `# 予算課題・事業対応ワークフロー管理レポート

## 判定

**PASS**

- DBスナップショット環境: \`${snapshot.sourceEnvironment}\`
- active dataset: \`${snapshot.activeDatasetId}\`
- manifest SHA-256: \`${snapshot.manifestSha256}\`
- 予算事業identity総数: ${metrics.totalIdentityCount}
- topic定義数: ${metrics.topicDefinitionCount}
- 候補に含まれるidentity数: ${metrics.candidateIdentityCount}
- 公開済みidentity数: ${metrics.publishedIdentityCount}
- 未分類identity数: ${metrics.unclassifiedIdentityCount}
- 公開済みtopic-program関係数: ${metrics.publishedRelationCount}
- review待ち件数: ${metrics.reviewPendingCount}

未分類identityはエラーではない。課題へ分類されていない事業も、検索、公式分類、全予算一覧から閲覧できる。
このレポートの公開済み件数は上記環境のスナップショットであり、本番状態を自動的には表さない。

## 大分類別

| 大分類 | topic数 | 候補 | B | C | review待ち | approve/revise | 公開済み関係 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${categoryRows}

## topic別

| 大分類 | topic | 候補 | B | C | approve/revise | reject | review待ち | 公開済み事業 | topic状態 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${topicRows}

## 運用ルール

- \`A_official_direct\` は公開7ファイルだけを根拠とする今回の候補生成では使用しない。
- Bは公式の款・項・目、事業名、部署名から構造的に強く判断できる候補である。
- Cは編集判断を多く含み、\`review_decision\` が空欄のまま自動公開しない。
- Supabaseへ送るのは、人間が全候補を確認し、\`approve\` または \`revise\` とした行だけである。
- \`reject\` は公開関係から除外する。空欄は未判断として、既存公開関係の削除にも使わない。
- グラフと公開APIは、\`published\` topicかつ\`published\` relationだけを返す。

## 再生成

候補生成:

\`pnpm budget:web:topics:candidates -- --input-dir /path/to/public-budget-data\`

管理レポート:

\`pnpm budget:web:topics:report -- --input-dir /path/to/public-budget-data\`

公開前dry-run:

\`pnpm budget:web:topics:publish -- --input-file data/budget/editorial/review/<review-file>.csv\`
`;
}
