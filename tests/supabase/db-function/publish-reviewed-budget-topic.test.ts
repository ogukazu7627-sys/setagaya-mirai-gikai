import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildReviewedBudgetTopicPayload,
  type ReviewedBudgetTopicPayload,
  readBudgetTopicReviewFile,
} from "../../../packages/seed/budget/publish-reviewed-budget-topic";
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

const admin = adminClient as SupabaseClient;
const anon = getAnonClient() as SupabaseClient;
const reviewedAt = "2026-07-30T16:33:02+09:00";
const reviewedCandidatesPath = fileURLToPath(
  new URL(
    "../../../data/budget/editorial/review/education-school-aging-candidates.csv",
    import.meta.url
  )
);

describe("publish_reviewed_budget_topic", () => {
  let dataset: BudgetTestDataset;
  let datasetId: string;
  let reviewerId: string;
  let reviewerEmail: string;
  let reviewerPassword: string;
  let topicId: string;
  let topicSlug: string;
  let payload: ReviewedBudgetTopicPayload;
  let firstApprovedIdentityId: string;
  let firstApprovedDisplayName: string;
  let firstRejectedIdentityId: string;

  beforeAll(async () => {
    dataset = createBudgetTestDataset();
    const imported = await admin.rpc("import_budget_dataset", {
      p_payload: asJson(dataset.builtImport.payload),
    });
    if (imported.error) {
      throw imported.error;
    }
    datasetId = (imported.data as { datasetId: string }).datasetId;

    const validation = await admin.rpc("validate_budget_dataset", {
      p_dataset_id: datasetId,
    });
    if (validation.error) {
      throw validation.error;
    }
    const activation = await admin.rpc("activate_budget_dataset", {
      p_dataset_id: datasetId,
    });
    if (activation.error) {
      throw activation.error;
    }

    const reviewer = await createTestUser();
    reviewerId = reviewer.id;
    reviewerEmail = reviewer.email;
    reviewerPassword = reviewer.password;

    const identity = await admin
      .from("budget_program_identities")
      .select("*")
      .eq("dataset_id", datasetId)
      .eq("budget_program_identity_id", "bpi_test")
      .single();
    if (identity.error) {
      throw identity.error;
    }
    const reviewFile = readBudgetTopicReviewFile(reviewedCandidatesPath);
    firstApprovedIdentityId =
      reviewFile.selectedRows[0].budget_program_identity_id;
    firstApprovedDisplayName = reviewFile.selectedRows[0].display_program_name;
    firstRejectedIdentityId =
      reviewFile.excludedRows[0].budget_program_identity_id;

    const candidateIdentities = await admin
      .from("budget_program_identities")
      .insert(
        reviewFile.rows.map((row) => ({
          ...identity.data,
          budget_program_identity_id: row.budget_program_identity_id,
          display_program_name: row.display_program_name,
          amount_thousand_yen: Number(row.amount_thousand_yen),
          is_zero_amount: Number(row.amount_thousand_yen) === 0,
        }))
      );
    if (candidateIdentities.error) {
      throw candidateIdentities.error;
    }

    topicSlug = `school-facility-aging-test-${crypto.randomUUID()}`;
    const reviewedPayload = buildReviewedBudgetTopicPayload(reviewFile, {
      id: reviewerId,
      reviewedAt,
    });
    payload = {
      ...reviewedPayload,
      topic: {
        ...reviewedPayload.topic,
        slug: topicSlug,
      },
    };
  });

  afterAll(async () => {
    if (topicId) {
      await admin.from("budget_topics").delete().eq("id", topicId);
    }
    if (datasetId) {
      await admin.from("budget_datasets").delete().eq("id", datasetId);
    }
    if (reviewerId) {
      await cleanupTestUser(reviewerId);
    }
    if (dataset) {
      cleanupBudgetTestDataset(dataset);
    }
  });

  it("approve/reviseだけを公開し、再実行して重複しない", async () => {
    const first = await admin.rpc("publish_reviewed_budget_topic", {
      p_payload: payload,
    });

    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({
      datasetId,
      publishedRelationCount: 13,
      removedRelationCount: 0,
      status: "published",
    });
    topicId = (first.data as { topicId: string }).topicId;

    const seededRejected = await admin.from("budget_topic_programs").insert({
      topic_id: topicId,
      dataset_id: datasetId,
      budget_program_identity_id: firstRejectedIdentityId,
      relation_type: "supports",
      explanation: "再実行時に除去される却下済み関係",
      evidence_level: "C_editorial",
      evidence_fields: { source: "test" },
      review_status: "published",
      reviewed_by: reviewerId,
      reviewed_at: reviewedAt,
    });
    expect(seededRejected.error).toBeNull();

    const second = await admin.rpc("publish_reviewed_budget_topic", {
      p_payload: payload,
    });
    expect(second.error).toBeNull();
    expect(second.data).toMatchObject({
      datasetId,
      topicId,
      publishedRelationCount: 13,
      removedRelationCount: 1,
      status: "published",
    });

    const relations = await admin
      .from("budget_topic_programs")
      .select("*")
      .eq("topic_id", topicId)
      .eq("dataset_id", datasetId);
    expect(relations.error).toBeNull();
    expect(relations.data).toHaveLength(13);
    expect(relations.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          budget_program_identity_id: firstApprovedIdentityId,
          relation_type: "responds_to",
          evidence_level: "B_strong_structural",
          review_status: "published",
          reviewed_by: reviewerId,
        }),
      ])
    );
    const firstRelation = relations.data?.find(
      (relation) =>
        relation.budget_program_identity_id === firstApprovedIdentityId
    );
    expect(firstRelation).toMatchObject({
      relation_type: "responds_to",
      evidence_level: "B_strong_structural",
      evidence_fields: {
        budget_item_key: "2026_general_expenditure_08_02_05",
      },
      review_status: "published",
      reviewed_by: reviewerId,
    });
    expect(new Date(firstRelation.reviewed_at).toISOString()).toBe(
      new Date(reviewedAt).toISOString()
    );
  });

  it("PostgRESTの公開APIで教育から承認済み事業まで取得できる", async () => {
    const category = await anon
      .from("budget_categories")
      .select("id, slug, name")
      .eq("slug", "education")
      .single();
    expect(category.error).toBeNull();
    expect(category.data).toMatchObject({ name: "教育" });

    const categoryTopic = await anon
      .from("budget_topic_categories")
      .select("topic_id")
      .eq("category_id", category.data.id)
      .eq("topic_id", topicId)
      .single();
    expect(categoryTopic.error).toBeNull();

    const topic = await anon
      .from("budget_topics")
      .select("id, slug, name, status")
      .eq("id", categoryTopic.data.topic_id)
      .single();
    expect(topic.error).toBeNull();
    expect(topic.data).toMatchObject({
      name: "学校施設の老朽化への対応",
      status: "published",
    });

    const relations = await anon
      .from("budget_topic_programs")
      .select(
        "dataset_id, budget_program_identity_id, relation_type, explanation, evidence_level, evidence_fields, review_status, reviewed_at"
      )
      .eq("topic_id", topic.data.id);
    expect(relations.error).toBeNull();
    expect(relations.data).toHaveLength(13);
    expect(relations.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          budget_program_identity_id: firstApprovedIdentityId,
          review_status: "published",
        }),
      ])
    );

    const identity = await anon
      .from("budget_program_identities")
      .select("budget_program_identity_id, display_program_name")
      .eq("budget_program_identity_id", firstApprovedIdentityId)
      .single();
    expect(identity.error).toBeNull();
    expect(identity.data).toEqual({
      budget_program_identity_id: firstApprovedIdentityId,
      display_program_name: firstApprovedDisplayName,
    });

    const hiddenReviewer = await anon
      .from("budget_topic_programs")
      .select("reviewed_by")
      .eq("topic_id", topicId);
    expect(hiddenReviewer.error).not.toBeNull();
  });

  it("anon/authenticatedから登録RPCを実行できない", async () => {
    const authenticated = (await getAuthenticatedClient(
      reviewerEmail,
      reviewerPassword
    )) as SupabaseClient;

    const [anonResult, authenticatedResult] = await Promise.all([
      anon.rpc("publish_reviewed_budget_topic", { p_payload: payload }),
      authenticated.rpc("publish_reviewed_budget_topic", {
        p_payload: payload,
      }),
    ]);

    expect(anonResult.error).not.toBeNull();
    expect(authenticatedResult.error).not.toBeNull();
  });

  it("存在しないidentityがあればtopic作成前に全体をロールバックする", async () => {
    const missingTopicSlug = `missing-identity-test-${crypto.randomUUID()}`;
    const missingIdentityPayload = {
      ...payload,
      topic: {
        ...payload.topic,
        slug: missingTopicSlug,
      },
      relations: [
        {
          ...payload.relations[0],
          budgetProgramIdentityId: "bpi_missing",
        },
      ],
    };

    const result = await admin.rpc("publish_reviewed_budget_topic", {
      p_payload: missingIdentityPayload,
    });
    expect(result.error?.message).toContain(
      "reviewed relations reference missing identities"
    );

    const topic = await admin
      .from("budget_topics")
      .select("id")
      .eq("slug", missingTopicSlug);
    expect(topic.error).toBeNull();
    expect(topic.data).toEqual([]);
  });
});
