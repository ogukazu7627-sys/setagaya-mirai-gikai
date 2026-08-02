import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asJson,
  type BudgetTestDataset,
  cleanupBudgetTestDataset,
  createBudgetTestDataset,
} from "../budget-test-dataset";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
  getAuthenticatedClient,
} from "../utils";

const anon = getAnonClient();
const password = "test-password-123";
const identityId = "bpi_test";

describe("budget topic editorial layer", () => {
  let activeDataset: BudgetTestDataset;
  let stagingDataset: BudgetTestDataset;
  let activeDatasetId: string;
  let stagingDatasetId: string;
  let previousActiveDatasetId: string | null = null;
  let userId: string;
  let email: string;
  let educationCategoryId: string;
  let welfareCategoryId: string;
  let draftCategoryId: string;
  let publishedTopicId: string;
  let candidateTopicId: string;
  let approvedTopicId: string;
  let draftTopicId: string;
  let reviewTopicId: string;
  let seededCategories: Array<{
    name: string;
    slug: string;
    sort_order: number;
    status: string;
  }>;

  beforeAll(async () => {
    const previousActiveDataset = await adminClient
      .from("budget_datasets")
      .select("id")
      .eq("fiscal_year", 2026)
      .eq("budget_type", "initial_budget")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (previousActiveDataset.error) {
      throw previousActiveDataset.error;
    }
    previousActiveDatasetId = previousActiveDataset.data?.id ?? null;

    activeDataset = createBudgetTestDataset();
    stagingDataset = createBudgetTestDataset();
    activeDatasetId = await importDataset(activeDataset);
    await validateAndActivate(activeDatasetId);
    stagingDatasetId = await importDataset(stagingDataset);

    email = `budget-topic-${Date.now()}@example.com`;
    const user = await createTestUser(email, password);
    userId = user.id;

    const categories = await adminClient
      .from("budget_categories")
      .select("id, name, slug, sort_order, status")
      .order("sort_order");
    if (categories.error || !categories.data) {
      throw categories.error ?? new Error("Budget categories were not found");
    }
    seededCategories = categories.data.map(
      ({ name, slug, sort_order, status }) => ({
        name,
        slug,
        sort_order,
        status,
      })
    );
    educationCategoryId = requireCategoryId(categories.data, "education");
    welfareCategoryId = requireCategoryId(categories.data, "welfare");

    const draftCategory = await adminClient
      .from("budget_categories")
      .insert({
        slug: `test-draft-${crypto.randomUUID()}`,
        name: `テスト非公開分類-${crypto.randomUUID()}`,
        short_description: "RLS確認用の非公開分類",
        sort_order: 999,
        status: "draft",
      })
      .select("id")
      .single();
    if (draftCategory.error) {
      throw draftCategory.error;
    }
    draftCategoryId = draftCategory.data.id;

    const topics = await adminClient
      .from("budget_topics")
      .insert([
        {
          slug: `test-published-${crypto.randomUUID()}`,
          name: "公開済みの生活課題",
          short_description: "人が確認して公開したテスト課題",
          topic_kind: "problem",
          status: "published",
          editorial_note: "公開してはいけない内部メモ",
        },
        {
          slug: `test-candidate-${crypto.randomUUID()}`,
          name: "候補関係を持つ公開課題",
          short_description: "関係候補はまだ公開しないテスト課題",
          topic_kind: "problem",
          status: "published",
          editorial_note: "候補関係の内部メモ",
        },
        {
          slug: `test-approved-${crypto.randomUUID()}`,
          name: "承認済み関係を持つ公開課題",
          short_description:
            "承認済みでも公開操作前は関係を公開しないテスト課題",
          topic_kind: "goal",
          status: "published",
          editorial_note: "承認済み関係の内部メモ",
        },
        {
          slug: `test-draft-${crypto.randomUUID()}`,
          name: "下書きの生活課題",
          short_description: "",
          topic_kind: "goal",
          status: "draft",
          editorial_note: "下書きメモ",
        },
        {
          slug: `test-review-${crypto.randomUUID()}`,
          name: "確認中の行政機能",
          short_description: "レビュー中の説明",
          topic_kind: "administrative_function",
          status: "review",
          editorial_note: "確認中メモ",
        },
      ])
      .select("id, name, status");
    if (topics.error || !topics.data) {
      throw topics.error ?? new Error("Budget topics were not created");
    }
    publishedTopicId = requireTopicIdByName(topics.data, "公開済みの生活課題");
    candidateTopicId = requireTopicIdByName(
      topics.data,
      "候補関係を持つ公開課題"
    );
    approvedTopicId = requireTopicIdByName(
      topics.data,
      "承認済み関係を持つ公開課題"
    );
    draftTopicId = requireTopicId(topics.data, "draft");
    reviewTopicId = requireTopicId(topics.data, "review");

    const topicCategories = await adminClient
      .from("budget_topic_categories")
      .insert([
        {
          topic_id: publishedTopicId,
          category_id: educationCategoryId,
          relevance_weight: 1,
          is_primary: true,
        },
        {
          topic_id: draftTopicId,
          category_id: welfareCategoryId,
          relevance_weight: 0.8,
          is_primary: true,
        },
        {
          topic_id: publishedTopicId,
          category_id: draftCategoryId,
          relevance_weight: 0.5,
          is_primary: false,
        },
      ]);
    if (topicCategories.error) {
      throw topicCategories.error;
    }

    const reviewedAt = new Date().toISOString();
    const topicPrograms = await adminClient
      .from("budget_topic_programs")
      .insert([
        relationRow({
          topicId: candidateTopicId,
          datasetId: activeDatasetId,
          relationType: "supports",
          reviewStatus: "candidate",
        }),
        relationRow({
          topicId: approvedTopicId,
          datasetId: activeDatasetId,
          relationType: "maintains",
          reviewStatus: "approved",
          reviewedBy: userId,
          reviewedAt,
        }),
        relationRow({
          topicId: publishedTopicId,
          datasetId: activeDatasetId,
          relationType: "responds_to",
          reviewStatus: "published",
          reviewedBy: userId,
          reviewedAt,
        }),
        relationRow({
          topicId: draftTopicId,
          datasetId: activeDatasetId,
          relationType: "enables",
          reviewStatus: "published",
          reviewedBy: userId,
          reviewedAt,
        }),
        relationRow({
          topicId: publishedTopicId,
          datasetId: stagingDatasetId,
          relationType: "responds_to",
          reviewStatus: "published",
          reviewedBy: userId,
          reviewedAt,
        }),
      ]);
    if (topicPrograms.error) {
      throw topicPrograms.error;
    }
  });

  afterAll(async () => {
    if (
      publishedTopicId ||
      candidateTopicId ||
      approvedTopicId ||
      draftTopicId ||
      reviewTopicId
    ) {
      await adminClient
        .from("budget_topics")
        .delete()
        .in(
          "id",
          [
            publishedTopicId,
            candidateTopicId,
            approvedTopicId,
            draftTopicId,
            reviewTopicId,
          ].filter(Boolean)
        );
    }
    if (draftCategoryId) {
      await adminClient
        .from("budget_categories")
        .delete()
        .eq("id", draftCategoryId);
    }
    if (activeDatasetId || stagingDatasetId) {
      await adminClient
        .from("budget_datasets")
        .delete()
        .in("id", [activeDatasetId, stagingDatasetId].filter(Boolean));
    }
    if (previousActiveDatasetId) {
      const staged = await adminClient
        .from("budget_datasets")
        .update({ status: "staging" })
        .eq("id", previousActiveDatasetId)
        .eq("status", "archived");
      if (staged.error) {
        throw staged.error;
      }
      await validateAndActivate(previousActiveDatasetId);
    }
    if (userId) {
      await cleanupTestUser(userId);
    }
    if (activeDataset) {
      cleanupBudgetTestDataset(activeDataset);
    }
    if (stagingDataset) {
      cleanupBudgetTestDataset(stagingDataset);
    }
  });

  it("指定された10大分類だけを決定的な順序で初期登録する", () => {
    expect(seededCategories).toEqual([
      category("education", "教育", 1),
      category("child-rearing", "子育て", 2),
      category("welfare", "福祉", 3),
      category("urban-development", "まちづくり", 4),
      category("disaster-prevention", "防災", 5),
      category("administration-finance", "行財政", 6),
      category("culture-sports", "文化・スポーツ", 7),
      category("industry", "産業", 8),
      category("environment", "環境問題", 9),
      category("daily-life", "暮らし", 10),
    ]);
  });

  it("migrationは課題や事業関係を自動生成しない", async () => {
    const testTopicIds = [
      publishedTopicId,
      candidateTopicId,
      approvedTopicId,
      draftTopicId,
      reviewTopicId,
    ];
    const topics = await adminClient
      .from("budget_topics")
      .select("id")
      .in("id", testTopicIds);
    const relations = await adminClient
      .from("budget_topic_programs")
      .select("topic_id")
      .in("topic_id", testTopicIds);

    expect(topics.error).toBeNull();
    expect(topics.data).toHaveLength(5);
    expect(relations.error).toBeNull();
    expect(relations.data).toHaveLength(5);
  });

  it("anon/authenticatedにはpublished topicだけを返す", async () => {
    const authenticated = await getAuthenticatedClient(email, password);
    const clients = [
      ["anon", anon],
      ["authenticated", authenticated],
    ] as const;

    for (const [role, client] of clients) {
      const result = await client
        .from("budget_topics")
        .select("id, slug, name, short_description, topic_kind, status")
        .in("id", [
          publishedTopicId,
          candidateTopicId,
          approvedTopicId,
          draftTopicId,
          reviewTopicId,
        ]);

      expect(result.error, role).toBeNull();
      expect(result.data, role).toHaveLength(3);
      expect(
        result.data?.map((topic) => topic.id),
        role
      ).toEqual(
        expect.arrayContaining([
          publishedTopicId,
          candidateTopicId,
          approvedTopicId,
        ])
      );
      expect(
        result.data?.every((topic) => topic.status === "published"),
        role
      ).toBe(true);
    }
  });

  it("非公開topicまたは非公開categoryの分類関係を返さない", async () => {
    const result = await anon
      .from("budget_topic_categories")
      .select("topic_id, category_id, relevance_weight, is_primary")
      .in("topic_id", [publishedTopicId, draftTopicId]);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        topic_id: publishedTopicId,
        category_id: educationCategoryId,
        relevance_weight: 1,
        is_primary: true,
      },
    ]);
  });

  it("published topic・published relation・active datasetだけを返す", async () => {
    const result = await findPublicRelations();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      expect.objectContaining({
        topic_id: publishedTopicId,
        dataset_id: activeDatasetId,
        budget_program_identity_id: identityId,
        review_status: "published",
      }),
    ]);
  });

  it("内部メモとレビュアーUUIDをanonへ公開しない", async () => {
    const topic = await anon
      .from("budget_topics")
      .select("id, editorial_note")
      .eq("id", publishedTopicId);
    const relation = await anon
      .from("budget_topic_programs")
      .select("topic_id, reviewed_by")
      .eq("topic_id", publishedTopicId);

    expect(topic.error).not.toBeNull();
    expect(relation.error).not.toBeNull();
  });

  it("anon/authenticatedから編集レイヤーへ書き込めない", async () => {
    const authenticated = await getAuthenticatedClient(email, password);
    const anonInsert = await anon.from("budget_topics").insert({
      slug: `unauthorized-${crypto.randomUUID()}`,
      name: "不正な課題",
      topic_kind: "problem",
    });
    const authenticatedUpdate = await authenticated
      .from("budget_topics")
      .update({ name: "不正な更新" })
      .eq("id", publishedTopicId);
    const anonDelete = await anon
      .from("budget_topic_programs")
      .delete()
      .eq("topic_id", publishedTopicId);

    expect(anonInsert.error).not.toBeNull();
    expect(authenticatedUpdate.error).not.toBeNull();
    expect(anonDelete.error).not.toBeNull();
  });

  it("人の確認情報がないrelationをpublishedにできない", async () => {
    const missingReviewer = await adminClient
      .from("budget_topic_programs")
      .insert(
        relationRow({
          topicId: reviewTopicId,
          datasetId: activeDatasetId,
          relationType: "responds_to",
          reviewStatus: "published",
        })
      );
    const missingIdentity = await adminClient
      .from("budget_topic_programs")
      .insert(
        relationRow({
          topicId: reviewTopicId,
          datasetId: activeDatasetId,
          relationType: "supports",
          reviewStatus: "candidate",
          identity: "missing-identity",
        })
      );

    expect(missingReviewer.error).not.toBeNull();
    expect(missingIdentity.error).not.toBeNull();
  });

  it("1課題に複数分類を許容しつつprimaryは1件に制限する", async () => {
    const result = await adminClient.from("budget_topic_categories").insert({
      topic_id: publishedTopicId,
      category_id: welfareCategoryId,
      relevance_weight: 0.7,
      is_primary: true,
    });

    expect(result.error).not.toBeNull();
  });

  it("active版を切り替えても同じ外部IDの関係を混在させない", async () => {
    await validateAndActivate(stagingDatasetId);
    const publicRelations = await findPublicRelations();
    const datasets = await adminClient
      .from("budget_datasets")
      .select("id, status")
      .in("id", [activeDatasetId, stagingDatasetId]);

    expect(publicRelations.error).toBeNull();
    expect(publicRelations.data).toEqual([
      expect.objectContaining({
        topic_id: publishedTopicId,
        dataset_id: stagingDatasetId,
        budget_program_identity_id: identityId,
      }),
    ]);
    expect(datasets.error).toBeNull();
    expect(datasets.data).toEqual(
      expect.arrayContaining([
        { id: activeDatasetId, status: "archived" },
        { id: stagingDatasetId, status: "active" },
      ])
    );
  });
});

async function importDataset(dataset: BudgetTestDataset): Promise<string> {
  const imported = await adminClient.rpc("import_budget_dataset", {
    p_payload: asJson(dataset.builtImport.payload),
  });
  if (imported.error) {
    throw imported.error;
  }
  return (imported.data as { datasetId: string }).datasetId;
}

async function validateAndActivate(datasetId: string): Promise<void> {
  const validation = await adminClient.rpc("validate_budget_dataset", {
    p_dataset_id: datasetId,
  });
  if (validation.error) {
    throw validation.error;
  }
  const activation = await adminClient.rpc("activate_budget_dataset", {
    p_dataset_id: datasetId,
  });
  if (activation.error) {
    throw activation.error;
  }
}

function relationRow(input: {
  topicId: string;
  datasetId: string;
  relationType: "responds_to" | "supports" | "maintains" | "enables";
  reviewStatus:
    | "candidate"
    | "review"
    | "approved"
    | "published"
    | "rejected"
    | "archived";
  reviewedBy?: string;
  reviewedAt?: string;
  identity?: string;
}) {
  return {
    topic_id: input.topicId,
    dataset_id: input.datasetId,
    budget_program_identity_id: input.identity ?? identityId,
    relation_type: input.relationType,
    explanation: "公式事業名と予算階層を根拠にしたテスト上の関係",
    evidence_level: "A_official_direct",
    evidence_fields: {
      display_program_name: "テスト事業",
      budget_item_key: "2026_general_expenditure_01_01_01",
    },
    evidence_source_url: "https://example.com/official-budget",
    review_status: input.reviewStatus,
    reviewed_by: input.reviewedBy,
    reviewed_at: input.reviewedAt,
  };
}

function findPublicRelations() {
  return anon
    .from("budget_topic_programs")
    .select(
      "topic_id, dataset_id, budget_program_identity_id, relation_type, explanation, evidence_level, evidence_fields, evidence_source_url, review_status, reviewed_at"
    );
}

function requireCategoryId(
  categories: Array<{ id: string; slug: string }>,
  slug: string
): string {
  const category = categories.find((entry) => entry.slug === slug);
  if (!category) {
    throw new Error(`Budget category was not found: ${slug}`);
  }
  return category.id;
}

function requireTopicId(
  topics: Array<{ id: string; name: string; status: string }>,
  status: string
): string {
  const topic = topics.find((entry) => entry.status === status);
  if (!topic) {
    throw new Error(`Budget topic was not found: ${status}`);
  }
  return topic.id;
}

function requireTopicIdByName(
  topics: Array<{ id: string; name: string }>,
  name: string
): string {
  const topic = topics.find((entry) => entry.name === name);
  if (!topic) {
    throw new Error(`Budget topic was not found: ${name}`);
  }
  return topic.id;
}

function category(slug: string, name: string, sortOrder: number) {
  return {
    slug,
    name,
    sort_order: sortOrder,
    status: "published",
  };
}
