import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  alternateManifestHash,
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
  type TestUser,
} from "../utils";

const client = adminClient as SupabaseClient;
let testDataset: BudgetTestDataset;
let datasetId: string;
let stagingDatasetId: string;
let reviewer: TestUser | undefined;
let searchTopicIds: string[] = [];

beforeAll(async () => {
  testDataset = createBudgetTestDataset();
  const imported = await client.rpc("import_budget_dataset", {
    p_payload: asJson(testDataset.builtImport.payload),
  });
  if (imported.error) {
    throw imported.error;
  }
  datasetId = (imported.data as { datasetId: string }).datasetId;

  const validation = await client.rpc("validate_budget_dataset", {
    p_dataset_id: datasetId,
  });
  if (validation.error) {
    throw validation.error;
  }
  const activation = await client.rpc("activate_budget_dataset", {
    p_dataset_id: datasetId,
  });
  if (activation.error) {
    throw activation.error;
  }

  await insertZeroAmountProgram();
  stagingDatasetId = await insertStagingOnlyProgram();
  const searchTopics = await insertSearchTopics();
  reviewer = searchTopics.reviewer;
  searchTopicIds = searchTopics.topicIds;
});

afterAll(async () => {
  if (searchTopicIds.length > 0) {
    await client.from("budget_topics").delete().in("id", searchTopicIds);
  }
  if (datasetId) {
    await client
      .from("budget_datasets")
      .delete()
      .in("id", [datasetId, stagingDatasetId].filter(Boolean));
  }
  if (testDataset) {
    cleanupBudgetTestDataset(testDataset);
  }
  if (reviewer) {
    await cleanupTestUser(reviewer.id);
  }
});

describe("budget read model RPC", () => {
  it("active datasetの会計別歳入・歳出概要だけを返す", async () => {
    const result = await client.rpc("get_budget_overview", {
      p_fiscal_year: 2026,
    });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      active_dataset: {
        id: datasetId,
        fiscal_year: 2026,
        validation_status: "PASS",
      },
      expenditure_total_amount_thousand_yen: 100,
      revenue_total_amount_thousand_yen: 100,
      identity_count: 2,
      accounts: [
        {
          account_code: "general",
          expenditure_amount_thousand_yen: 100,
          revenue_amount_thousand_yen: 100,
          identity_count: 2,
        },
      ],
    });
  });

  it("同年度のstaging datasetを検索結果へ混在させない", async () => {
    const result = await search("非公開ステージング事業", {
      includeZeroAmount: true,
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("完全一致・部分一致・表記正規化で検索し一覧を返す", async () => {
    const exact = await search("テ スト（事業）");
    expect(exact.error).toBeNull();
    expect(exact.data).toEqual([
      expect.objectContaining({
        budget_program_identity_id: "bpi_test",
        matched_field: "display_program_name",
        total_count: 1,
      }),
    ]);

    const partial = await search("内訳");
    expect(partial.error).toBeNull();
    expect(partial.data?.map((row) => row.budget_program_identity_id)).toEqual([
      "bpi_test",
    ]);

    const department = await search("テスト課");
    expect(department.error).toBeNull();
    expect(
      department.data?.map((row) => row.budget_program_identity_id)
    ).toContain("bpi_test");

    const percent = await search("%");
    const underscore = await search("_");
    expect(percent.error).toBeNull();
    expect(percent.data).toEqual([]);
    expect(underscore.error).toBeNull();
    expect(underscore.data).toEqual([]);
  });

  it("人が公開した課題名だけを検索対象とし、公開課題タグを返す", async () => {
    const published = await search("学校施設の老朽化への対応");

    expect(published.error).toBeNull();
    expect(published.data).toEqual([
      expect.objectContaining({
        budget_program_identity_id: "bpi_test",
        matched_field: "topic_name",
        published_topics: [
          {
            slug: expect.stringMatching(/^budget-search-published-/),
            name: "学校施設の老朽化への対応",
          },
        ],
      }),
    ]);

    const unpublishedTopic = await search("非公開の課題");
    const unpublishedRelation = await search("公開前の関係");
    expect(unpublishedTopic.error).toBeNull();
    expect(unpublishedTopic.data).toEqual([]);
    expect(unpublishedRelation.error).toBeNull();
    expect(unpublishedRelation.data).toEqual([]);
  });

  it("0円事業を既定で除外し、指定時だけ含める", async () => {
    const defaultResult = await search("廃止事業");
    expect(defaultResult.error).toBeNull();
    expect(defaultResult.data).toEqual([]);

    const included = await search("廃止事業", {
      includeZeroAmount: true,
    });
    expect(included.error).toBeNull();
    expect(included.data).toEqual([
      expect.objectContaining({
        budget_program_identity_id: "bpi_zero",
        is_zero_amount: true,
      }),
    ]);
  });

  it("検索結果をidentity単位でページングする", async () => {
    const first = await search("事業", {
      includeZeroAmount: true,
      page: 1,
      pageSize: 1,
    });
    const second = await search("事業", {
      includeZeroAmount: true,
      page: 2,
      pageSize: 1,
    });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toHaveLength(1);
    expect(second.data).toHaveLength(1);
    expect(first.data?.[0]?.total_count).toBe(2);
    expect(second.data?.[0]?.total_count).toBe(2);
    expect(first.data?.[0]?.budget_program_identity_id).not.toBe(
      second.data?.[0]?.budget_program_identity_id
    );
  });

  it("RPC境界でも検索長とページサイズを制限する", async () => {
    const longQuery = await search("予".repeat(101));
    const largePage = await client.rpc("search_budget_programs", {
      p_query: "予算",
      p_fiscal_year: 2026,
      p_account_code: null,
      p_include_zero_amount: false,
      p_page: 1,
      p_page_size: 51,
    });

    expect(longQuery.data).toBeNull();
    expect(longQuery.error).not.toBeNull();
    expect(largePage.data).toBeNull();
    expect(largePage.error).not.toBeNull();
  });

  it("事業詳細をprogram・目・節・関連歳入ごとに一括取得する", async () => {
    const result = await client.rpc("get_budget_program_detail", {
      p_budget_program_identity_id: "bpi_test",
      p_fiscal_year: 2026,
    });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      identity: {
        budget_program_identity_id: "bpi_test",
        budget_item_key: "2026_general_expenditure_01_01_01",
      },
      member_programs: [{ program_id: "program_test" }],
      budget_item: {
        budget_item_key: "2026_general_expenditure_01_01_01",
      },
      sections: [{ section_id: "section_test", scope: "budget_item" }],
      related_revenue_details: [
        {
          revenue_detail_id: "revenue_detail_test",
          amount_attribution_status: "not_available",
        },
      ],
      published_topics: [
        {
          slug: expect.stringMatching(/^budget-search-published-/),
          name: "学校施設の老朽化への対応",
          relation_type: "responds_to",
          explanation: "公開課題名の検索確認",
          evidence_level: "B_strong_structural",
          evidence_fields: {
            identity_fields: {
              display_program_name: "テスト（事業）",
              hierarchy: ["総務費", "総務管理費", "一般管理費"],
            },
          },
          categories: [
            {
              slug: "education",
              name: "教育",
              is_primary: true,
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(result.data)).not.toContain("非公開の課題");
    expect(JSON.stringify(result.data)).not.toContain("公開前の関係");
  });

  it("同年度の別予算種別がactiveでも当初予算の事業詳細だけを返す", async () => {
    const supplemental = await client
      .from("budget_datasets")
      .insert({
        fiscal_year: 2026,
        budget_type: "supplemental_budget",
        schema_version: "public-budget-v1",
        currency_unit: "thousand_yen",
        status: "active",
        manifest_json: {},
        manifest_sha256: alternateManifestHash(),
        import_summary_json: {},
        validation_status: "PASS",
        activated_at: "2099-01-01T00:00:00.000Z",
      })
      .select("id")
      .single();
    if (supplemental.error) {
      throw supplemental.error;
    }

    try {
      const result = await client.rpc("get_budget_program_detail", {
        p_budget_program_identity_id: "bpi_test",
        p_fiscal_year: 2026,
      });

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        active_dataset: {
          id: datasetId,
          budget_type: "initial_budget",
        },
        identity: {
          budget_program_identity_id: "bpi_test",
        },
      });
    } finally {
      await client
        .from("budget_datasets")
        .delete()
        .eq("id", supplemental.data.id);
    }
  });

  it("会計・款・項・目・事業の公的階層を返す", async () => {
    const result = await client.rpc("get_budget_official_hierarchy", {
      p_fiscal_year: 2026,
      p_account_code: "general",
    });

    expect(result.error).toBeNull();
    const data = result.data as {
      active_dataset: { id: string };
      accounts: Array<{
        account_code: string;
        kans: Array<{
          code: string;
          kous: Array<{
            code: string;
            mokus: Array<{
              code: string;
              programs: Array<{
                budget_program_identity_id: string;
              }>;
            }>;
          }>;
        }>;
      }>;
    };
    const general = data.accounts.find(
      (account) => account.account_code === "general"
    );
    const kan = general?.kans.find((entry) => entry.code === "01");
    const kou = kan?.kous.find((entry) => entry.code === "01");
    const moku = kou?.mokus.find((entry) => entry.code === "01");

    expect(data.active_dataset.id).toBe(datasetId);
    expect(
      moku?.programs.map((program) => program.budget_program_identity_id)
    ).toContain("bpi_test");
  });

  it("歳入の目・節・細節と関連歳出事業を一括取得する", async () => {
    const result = await client.rpc("get_budget_revenue_item", {
      p_revenue_item_key: "2026_general_revenue_01_01_01",
      p_fiscal_year: 2026,
    });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      item: {
        revenue_item_key: "2026_general_revenue_01_01_01",
        current_amount_thousand_yen: 100,
      },
      sections: [{ revenue_section_id: "revenue_section_test" }],
      details: [{ revenue_detail_id: "revenue_detail_test" }],
      related_expenditure_programs: [
        {
          budget_program_identity_id: "bpi_test",
          relation_count: 1,
        },
      ],
    });
  });

  it("読み取りRPCをanonから直接実行できない", async () => {
    const anon = getAnonClient();
    const calls = await Promise.all([
      anon.rpc("get_budget_overview", { p_fiscal_year: 2026 }),
      anon.rpc("search_budget_programs", {
        p_query: "テスト",
        p_fiscal_year: 2026,
        p_account_code: null,
        p_include_zero_amount: false,
        p_page: 1,
        p_page_size: 20,
      }),
      anon.rpc("get_budget_program_detail", {
        p_budget_program_identity_id: "bpi_test",
        p_fiscal_year: 2026,
      }),
      anon.rpc("get_budget_official_hierarchy", {
        p_fiscal_year: 2026,
        p_account_code: "general",
      }),
      anon.rpc("get_budget_revenue_item", {
        p_revenue_item_key: "2026_general_revenue_01_01_01",
        p_fiscal_year: 2026,
      }),
    ]);

    expect(calls.every((call) => call.data === null)).toBe(true);
    expect(calls.every((call) => call.error !== null)).toBe(true);
  });

  it("検索・事業詳細RPCをauthenticatedから直接実行できない", async () => {
    if (!reviewer) {
      throw new Error("Budget search reviewer fixture is unavailable");
    }
    const authenticated = await getAuthenticatedClient(
      reviewer.email,
      reviewer.password
    );
    const results = await Promise.all([
      authenticated.rpc("search_budget_programs", {
        p_query: "テスト",
        p_fiscal_year: 2026,
        p_account_code: null,
        p_include_zero_amount: false,
        p_page: 1,
        p_page_size: 20,
      }),
      authenticated.rpc("get_budget_program_detail", {
        p_budget_program_identity_id: "bpi_test",
        p_fiscal_year: 2026,
      }),
    ]);

    expect(results.every((result) => result.data === null)).toBe(true);
    expect(results.every((result) => result.error !== null)).toBe(true);
  });
});

async function search(
  query: string,
  options: {
    includeZeroAmount?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
) {
  return client.rpc("search_budget_programs", {
    p_query: query,
    p_fiscal_year: 2026,
    p_account_code: null,
    p_include_zero_amount: options.includeZeroAmount ?? false,
    p_page: options.page ?? 1,
    p_page_size: options.pageSize ?? 20,
  });
}

async function insertZeroAmountProgram() {
  const item = await client.from("budget_items").insert({
    dataset_id: datasetId,
    budget_item_key: "2026_general_expenditure_99_99_99",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "expenditure",
    kan_code: "99",
    kan_name: "その他款",
    kou_code: "99",
    kou_name: "その他項",
    moku_code: "99",
    moku_name: "その他目",
    amount_thousand_yen: 0,
    validation_status: "ok_zero_amount",
    is_zero_amount: true,
    data_availability: {},
    source_references: [],
  });
  if (item.error) {
    throw item.error;
  }

  const identity = await client.from("budget_program_identities").insert({
    dataset_id: datasetId,
    budget_program_identity_id: "bpi_zero",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "expenditure",
    budget_item_key: "2026_general_expenditure_99_99_99",
    kan_code: "99",
    kan_name: "その他款",
    kou_code: "99",
    kou_name: "その他項",
    moku_code: "99",
    moku_name: "その他目",
    display_program_name: "廃止事業",
    department_display_name: "テスト部",
    amount_thousand_yen: 0,
    member_group_count: 1,
    member_program_count: 1,
    related_revenue_count: 0,
    has_public_identity_resolution: false,
    is_zero_amount: true,
    source_type: "derived_public",
  });
  if (identity.error) {
    throw identity.error;
  }

  const program = await client.from("budget_programs").insert({
    dataset_id: datasetId,
    program_id: "program_zero",
    budget_item_key: "2026_general_expenditure_99_99_99",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "expenditure",
    kan_code: "99",
    kan_name: "その他款",
    kou_code: "99",
    kou_name: "その他項",
    moku_code: "99",
    moku_name: "その他目",
    major_program_name: "廃止大事業",
    budget_program_name: "廃止事業",
    detail_program_name: "廃止内訳",
    department_display_name: "テスト部",
    amount_thousand_yen: 0,
    is_zero_amount: true,
    source_type: "official_csv",
    source_file: "ippansaisyutu.csv",
    source_row_number: 2,
    budget_program_identity_id: "bpi_zero",
  });
  if (program.error) {
    throw program.error;
  }
}

async function insertStagingOnlyProgram(): Promise<string> {
  const dataset = await client
    .from("budget_datasets")
    .insert({
      fiscal_year: 2026,
      budget_type: "initial_budget",
      schema_version: "public-budget-v1",
      currency_unit: "thousand_yen",
      status: "staging",
      manifest_json: {},
      manifest_sha256: alternateManifestHash(),
      import_summary_json: {},
      validation_status: "PENDING",
    })
    .select("id")
    .single();
  if (dataset.error) {
    throw dataset.error;
  }
  const insertedDatasetId = dataset.data.id;

  const item = await client.from("budget_items").insert({
    dataset_id: insertedDatasetId,
    budget_item_key: "2026_general_expenditure_98_98_98",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "expenditure",
    kan_code: "98",
    kan_name: "非公開款",
    kou_code: "98",
    kou_name: "非公開項",
    moku_code: "98",
    moku_name: "非公開目",
    amount_thousand_yen: 1,
    validation_status: "ok",
    is_zero_amount: false,
    data_availability: {},
    source_references: [],
  });
  if (item.error) {
    throw item.error;
  }

  const identity = await client.from("budget_program_identities").insert({
    dataset_id: insertedDatasetId,
    budget_program_identity_id: "bpi_staging",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "expenditure",
    budget_item_key: "2026_general_expenditure_98_98_98",
    kan_code: "98",
    kan_name: "非公開款",
    kou_code: "98",
    kou_name: "非公開項",
    moku_code: "98",
    moku_name: "非公開目",
    display_program_name: "非公開ステージング事業",
    department_display_name: "非公開部",
    amount_thousand_yen: 1,
    member_group_count: 1,
    member_program_count: 1,
    related_revenue_count: 0,
    has_public_identity_resolution: false,
    is_zero_amount: false,
    source_type: "derived_public",
  });
  if (identity.error) {
    throw identity.error;
  }

  return insertedDatasetId;
}

async function insertSearchTopics(): Promise<{
  reviewer: TestUser;
  topicIds: string[];
}> {
  const reviewer = await createTestUser();
  const topicSuffix = crypto.randomUUID();
  const topics = await client
    .from("budget_topics")
    .insert([
      {
        slug: `budget-search-published-${topicSuffix}`,
        name: "学校施設の老朽化への対応",
        short_description: "公開課題名の検索確認",
        topic_kind: "problem",
        status: "published",
        editorial_note: "",
      },
      {
        slug: `budget-search-review-${topicSuffix}`,
        name: "非公開の課題",
        short_description: "レビュー中課題の検索除外確認",
        topic_kind: "problem",
        status: "review",
        editorial_note: "",
      },
      {
        slug: `budget-search-pending-relation-${topicSuffix}`,
        name: "公開前の関係",
        short_description: "候補関係の検索除外確認",
        topic_kind: "problem",
        status: "published",
        editorial_note: "",
      },
    ])
    .select("id, slug, status");
  if (topics.error || !topics.data) {
    await cleanupTestUser(reviewer.id);
    throw topics.error ?? new Error("Failed to insert budget search topics");
  }

  const publishedTopic = topics.data.find((topic) =>
    topic.slug.startsWith("budget-search-published-")
  );
  const reviewTopic = topics.data.find((topic) =>
    topic.slug.startsWith("budget-search-review-")
  );
  const pendingRelationTopic = topics.data.find((topic) =>
    topic.slug.startsWith("budget-search-pending-relation-")
  );
  if (!publishedTopic || !reviewTopic || !pendingRelationTopic) {
    await client
      .from("budget_topics")
      .delete()
      .in(
        "id",
        topics.data.map((topic) => topic.id)
      );
    await cleanupTestUser(reviewer.id);
    throw new Error("Budget search topic fixture is incomplete");
  }

  const topicCategory = await client.from("budget_topic_categories").insert({
    topic_id: publishedTopic.id,
    category_id: "b0000000-0000-4000-8000-000000000001",
    relevance_weight: 1,
    is_primary: true,
  });
  if (topicCategory.error) {
    await client
      .from("budget_topics")
      .delete()
      .in(
        "id",
        topics.data.map((topic) => topic.id)
      );
    await cleanupTestUser(reviewer.id);
    throw topicCategory.error;
  }

  const relations = await client.from("budget_topic_programs").insert([
    {
      topic_id: publishedTopic.id,
      dataset_id: datasetId,
      budget_program_identity_id: "bpi_test",
      relation_type: "responds_to",
      explanation: "公開課題名の検索確認",
      evidence_level: "B_strong_structural",
      evidence_fields: {
        identity_fields: {
          display_program_name: "テスト（事業）",
          hierarchy: ["総務費", "総務管理費", "一般管理費"],
        },
      },
      review_status: "published",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    },
    {
      topic_id: reviewTopic.id,
      dataset_id: datasetId,
      budget_program_identity_id: "bpi_test",
      relation_type: "responds_to",
      explanation: "レビュー中課題の検索除外確認",
      evidence_level: "C_editorial",
      evidence_fields: {},
      review_status: "published",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    },
    {
      topic_id: pendingRelationTopic.id,
      dataset_id: datasetId,
      budget_program_identity_id: "bpi_test",
      relation_type: "responds_to",
      explanation: "候補関係の検索除外確認",
      evidence_level: "C_editorial",
      evidence_fields: {},
      review_status: "candidate",
      reviewed_by: null,
      reviewed_at: null,
    },
  ]);
  if (relations.error) {
    await client
      .from("budget_topics")
      .delete()
      .in(
        "id",
        topics.data.map((topic) => topic.id)
      );
    await cleanupTestUser(reviewer.id);
    throw relations.error;
  }

  return {
    reviewer,
    topicIds: topics.data.map((topic) => topic.id),
  };
}
