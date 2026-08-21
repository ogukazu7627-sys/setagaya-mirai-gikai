import { createHash, randomUUID } from "node:crypto";
import {
  adminClient,
  cleanupTestBill,
  cleanupTestDietSession,
  cleanupTestTag,
  createTestBill,
  createTestBillContent,
  createTestBillTag,
  createTestDietSession,
  createTestTag,
} from "@test-utils/utils";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { env } from "@/lib/env";
import { GET, PATCH } from "./route";

const cacheMocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
  revalidateTag: cacheMocks.revalidateTag,
  revalidatePath: vi.fn(),
}));

vi.hoisted(() => {
  process.env.ADMIN_API_TOKEN = "test-admin-api-token";
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "http://127.0.0.1:54421";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "test-publishable-key";
  delete process.env.NEXT_PUBLIC_SETAGAYA_MOCK_MODE;
  delete process.env.SETAGAYA_MOCK_MODE;
});

const ADMIN_API_TOKEN = "test-admin-api-token";
const PRIVATE_NO_STORE = "private, no-store";
const billIds: string[] = [];
const dietSessionIds: string[] = [];
const tagIds: string[] = [];

type BillFixture = Awaited<ReturnType<typeof createPublishedBudgetFixture>>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function authorizationHeaders(token: string | null = ADMIN_API_TOKEN) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

async function getKnowledgeSource(
  query: Record<string, string>,
  token: string | null = ADMIN_API_TOKEN
): Promise<Response> {
  const url = new URL("http://localhost/api/admin/bills/knowledge-source");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return GET(
    new Request(url, {
      method: "GET",
      headers: authorizationHeaders(token),
    })
  );
}

async function patchKnowledgeSource(
  body: unknown,
  token: string | null = ADMIN_API_TOKEN
): Promise<Response> {
  return PATCH(
    new Request("http://localhost/api/admin/bills/knowledge-source", {
      method: "PATCH",
      headers: authorizationHeaders(token),
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

async function createPublishedBudgetFixture({
  knowledgeSource = null,
  name = `予算ナレッジテスト ${randomUUID()}`,
  publicationCategory = "budget",
  publishStatus = "published",
  useKnowledgeSourceInChat = true,
}: {
  knowledgeSource?: string | null;
  name?: string;
  publicationCategory?: "report" | "general_question" | "budget";
  publishStatus?: "draft" | "published" | "coming_soon";
  useKnowledgeSourceInChat?: boolean;
} = {}) {
  const session = await createTestDietSession({
    name: `予算ナレッジテスト会期 ${randomUUID()}`,
    slug: `budget-knowledge-${randomUUID()}`,
  });
  dietSessionIds.push(session.id);

  const bill = await createTestBill({
    name,
    publish_status: publishStatus,
    publication_category: publicationCategory,
    major_category: "教育🏫",
    diet_session_id: session.id,
    submitted_date: "2026-03-05",
  });
  billIds.push(bill.id);

  const publishedAt = "2026-08-17T10:20:30.000Z";
  const { data: configuredBill, error } = await adminClient
    .from("bills")
    .update({
      item_type: "report",
      knowledge_source: knowledgeSource,
      published_at: publishedAt,
      status_label: "予算特別委員会で質疑",
      status_note: "不変フィールド監査用",
      sources: [
        {
          title: "世田谷区議会会議録",
          url: "https://example.com/record",
          source_type: "official_page",
        },
      ],
      use_knowledge_source_in_chat: useKnowledgeSourceInChat,
      is_review_completed: true,
      is_featured: true,
      interview_enabled: true,
      thumbnail_url: "https://example.com/thumbnail.png",
      share_thumbnail_url: "https://example.com/share.png",
    })
    .eq("id", bill.id)
    .select("*")
    .single();
  if (error || !configuredBill) {
    throw new Error(`bill初期化失敗: ${error?.message}`);
  }

  const normalContent = await createTestBillContent(bill.id, {
    difficulty_level: "normal",
    title: "予算質疑の表示タイトル",
    summary: "予算質疑の概要です。",
    content: "# 議員、会派の意見\n\n本文は変更しません。",
  });
  const hardContent = await createTestBillContent(bill.id, {
    difficulty_level: "hard",
    title: "予算質疑の詳細タイトル",
    summary: "予算質疑の詳細な概要です。",
    content: "# 議員、会派の意見\n\n詳細本文も変更しません。",
  });

  return {
    bill: configuredBill,
    hardContent,
    normalContent,
    session,
  };
}

function validPatchBody(
  fixture: BillFixture,
  knowledgeSource: string | null,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: fixture.bill.id,
    expected_name: fixture.bill.name,
    diet_session_id: fixture.session.id,
    expected_updated_at: fixture.bill.updated_at,
    expected_published_at: fixture.bill.published_at,
    expected_knowledge_source_sha256:
      fixture.bill.knowledge_source === null
        ? null
        : sha256(fixture.bill.knowledge_source),
    knowledge_source: knowledgeSource,
    ...overrides,
  };
}

async function readBillAndContents(billId: string) {
  const [
    billResult,
    contentsResult,
    tagsResult,
    statementsResult,
    interviewConfigsResult,
  ] = await Promise.all([
    adminClient.from("bills").select("*").eq("id", billId).single(),
    adminClient
      .from("bill_contents")
      .select("*")
      .eq("bill_id", billId)
      .order("difficulty_level"),
    adminClient
      .from("bills_tags")
      .select("*")
      .eq("bill_id", billId)
      .order("tag_id"),
    adminClient
      .from("councilor_bill_statements")
      .select("*")
      .eq("bill_id", billId)
      .order("id"),
    adminClient
      .from("interview_configs")
      .select("*")
      .eq("bill_id", billId)
      .order("id"),
  ]);
  const relatedError =
    contentsResult.error ??
    tagsResult.error ??
    statementsResult.error ??
    interviewConfigsResult.error;
  if (billResult.error || relatedError || !billResult.data) {
    throw new Error(
      `監査用読み取り失敗: ${billResult.error?.message ?? relatedError?.message}`
    );
  }
  return {
    bill: billResult.data,
    contents: contentsResult.data ?? [],
    tags: tagsResult.data ?? [],
    statements: statementsResult.data ?? [],
    interviewConfigs: interviewConfigsResult.data ?? [],
  };
}

function immutableBillFields(bill: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(bill).filter(
      ([key]) => key !== "knowledge_source" && key !== "updated_at"
    )
  );
}

describe("/api/admin/bills/knowledge-source", () => {
  beforeEach(() => {
    cacheMocks.revalidateTag.mockReset();
    (env as { adminApiToken?: string }).adminApiToken = ADMIN_API_TOKEN;
  });

  afterAll(async () => {
    await Promise.all(billIds.map((billId) => cleanupTestBill(billId)));
    await Promise.all(
      dietSessionIds.map((sessionId) => cleanupTestDietSession(sessionId))
    );
    await Promise.all(tagIds.map((tagId) => cleanupTestTag(tagId)));
  });

  it("GETとPATCHはADMIN_API_TOKEN未設定時500を返す", async () => {
    (env as { adminApiToken?: string }).adminApiToken = undefined;

    const getResponse = await getKnowledgeSource({
      id: randomUUID(),
      diet_session_id: randomUUID(),
    });
    const patchResponse = await patchKnowledgeSource({});

    for (const response of [getResponse, patchResponse]) {
      expect(response.status).toBe(500);
      expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        code: "admin_api_token_not_configured",
      });
    }
  });

  it("GETとPATCHはtokenなし・不一致を401で拒否する", async () => {
    const getWithoutToken = await getKnowledgeSource(
      { id: randomUUID(), diet_session_id: randomUUID() },
      null
    );
    const patchWithBadToken = await patchKnowledgeSource({}, "bad-token");

    for (const response of [getWithoutToken, patchWithBadToken]) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        code: "unauthorized",
      });
    }
  });

  it("PATCHの不正なJSONは400で本文を返さない", async () => {
    const response = await patchKnowledgeSource("{");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    expect(body).toMatchObject({ success: false, code: "invalid_json" });
    expect(body).not.toHaveProperty("knowledge_source");
  });

  it("GETとPATCHは未知フィールドをstrict validationで400にする", async () => {
    const fixture = await createPublishedBudgetFixture();

    const getResponse = await getKnowledgeSource({
      id: fixture.bill.id,
      diet_session_id: fixture.session.id,
      unexpected: "field",
    });
    const patchResponse = await patchKnowledgeSource(
      validPatchBody(fixture, "投入予定本文", { unexpected: "field" })
    );

    for (const response of [getResponse, patchResponse]) {
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        code: "invalid_request",
      });
    }
  });

  it("GETはnullのナレッジソースをprivate no-storeで返す", async () => {
    const fixture = await createPublishedBudgetFixture();

    const response = await getKnowledgeSource({
      id: fixture.bill.id,
      diet_session_id: fixture.session.id,
    });
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    expect(body).toMatchObject({
      success: true,
      bill_id: fixture.bill.id,
      name: fixture.bill.name,
      diet_session_id: fixture.session.id,
      publication_category: "budget",
      publish_status: "published",
      knowledge_source: null,
      knowledge_source_sha256: null,
      knowledge_source_length: 0,
      knowledge_source_bytes: 0,
    });
  });

  it("GETは必須クエリ・UUID・存在を厳格に検証する", async () => {
    const missingSession = await getKnowledgeSource({ id: randomUUID() });
    const invalidId = await getKnowledgeSource({
      id: "not-a-uuid",
      diet_session_id: randomUUID(),
    });
    const unknownBill = await getKnowledgeSource({
      id: randomUUID(),
      diet_session_id: randomUUID(),
    });

    expect(missingSession.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(unknownBill.status).toBe(404);
  });

  it("PATCHは空白・上限超過・不正な日時とSHAを400で拒否する", async () => {
    const fixture = await createPublishedBudgetFixture();
    const responses = await Promise.all([
      patchKnowledgeSource(validPatchBody(fixture, "  \n  ")),
      patchKnowledgeSource(validPatchBody(fixture, "あ".repeat(200_001))),
      patchKnowledgeSource(
        validPatchBody(fixture, "本文", { expected_updated_at: "2026-08-17" })
      ),
      patchKnowledgeSource(
        validPatchBody(fixture, "本文", {
          expected_knowledge_source_sha256: "A".repeat(64),
        })
      ),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        code: "invalid_request",
      });
    }
  });

  it("GETは日本語・emoji本文とSHA-256・文字数・byte数を正確に返す", async () => {
    const knowledgeSource = "世田谷🏫\n予算の質問です。";
    const fixture = await createPublishedBudgetFixture({ knowledgeSource });

    const response = await getKnowledgeSource({
      id: fixture.bill.id,
      diet_session_id: fixture.session.id,
    });
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body).toMatchObject({
      success: true,
      knowledge_source: knowledgeSource,
      knowledge_source_sha256: sha256(knowledgeSource),
      knowledge_source_length: knowledgeSource.length,
      knowledge_source_bytes: Buffer.byteLength(knowledgeSource, "utf8"),
    });
  });

  it("dry_run省略時は安全側のdry-runとなりDBを変更しない", async () => {
    const fixture = await createPublishedBudgetFixture();
    const candidate = "dry-runの日本語🌿本文";
    const before = await readBillAndContents(fixture.bill.id);

    const response = await patchKnowledgeSource(
      validPatchBody(fixture, candidate)
    );
    const body = await response.json();
    const after = await readBillAndContents(fixture.bill.id);

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    expect(body).toMatchObject({
      success: true,
      dry_run: true,
      updated: false,
      would_update: true,
      candidate: {
        knowledge_source_sha256: sha256(candidate),
        knowledge_source_length: candidate.length,
        knowledge_source_bytes: Buffer.byteLength(candidate, "utf8"),
      },
    });
    expect(JSON.stringify(body)).not.toContain(candidate);
    expect(after).toEqual(before);
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("commitはナレッジソースとupdated_at以外を変更しない", async () => {
    const fixture = await createPublishedBudgetFixture({
      useKnowledgeSourceInChat: false,
    });
    const tag = await createTestTag();
    tagIds.push(tag.id);
    await createTestBillTag(fixture.bill.id, tag.id);
    const { error: statementError } = await adminClient
      .from("councilor_bill_statements")
      .insert({
        bill_id: fixture.bill.id,
        content_md: "議員発言Markdown",
        content_text: "議員発言本文",
        councilor_name: "テスト議員",
        raw_heading: "テスト議員",
        statement_index: 0,
      });
    const { error: interviewConfigError } = await adminClient
      .from("interview_configs")
      .insert({
        bill_id: fixture.bill.id,
        name: "不変性監査用インタビュー設定",
        status: "public",
      });
    if (statementError || interviewConfigError) {
      throw new Error(
        `関連データ作成失敗: ${statementError?.message ?? interviewConfigError?.message}`
      );
    }
    const candidate = "# 予算特別委員会\n\n原文🏫を保存します。";
    const before = await readBillAndContents(fixture.bill.id);

    const response = await patchKnowledgeSource(
      validPatchBody(fixture, candidate, { dry_run: false })
    );
    const body = await response.json();
    const after = await readBillAndContents(fixture.bill.id);

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body).toMatchObject({
      success: true,
      dry_run: false,
      updated: true,
      would_update: true,
      current: {
        knowledge_source_sha256: sha256(candidate),
        knowledge_source_length: candidate.length,
        knowledge_source_bytes: Buffer.byteLength(candidate, "utf8"),
      },
    });
    expect(body).not.toHaveProperty("knowledge_source");
    expect(JSON.stringify(body)).not.toContain(candidate);
    expect(after.bill.knowledge_source).toBe(candidate);
    expect(after.bill.updated_at).not.toBe(before.bill.updated_at);
    expect(immutableBillFields(after.bill)).toEqual(
      immutableBillFields(before.bill)
    );
    expect(after.contents).toEqual(before.contents);
    expect(after.bill.published_at).toBe(before.bill.published_at);
    expect(after.bill.use_knowledge_source_in_chat).toBe(false);
    expect(cacheMocks.revalidateTag).toHaveBeenCalledOnce();
    expect(cacheMocks.revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.BILLS);
  });

  it("knowledge_sourceとupdated_atだけのcommitは検索索引jobを新規作成・更新しない", async () => {
    const missingJobFixture = await createPublishedBudgetFixture();
    const { error: deleteJobError } = await adminClient
      .from("council_search_index_jobs")
      .delete()
      .eq("bill_id", missingJobFixture.bill.id);
    expect(deleteJobError).toBeNull();

    const missingJobResponse = await patchKnowledgeSource(
      validPatchBody(missingJobFixture, "索引jobを作らない本文", {
        dry_run: false,
      })
    );
    const missingJobBody = await missingJobResponse.json();
    expect(missingJobResponse.status, JSON.stringify(missingJobBody)).toBe(200);

    const missingJobAfter = await adminClient
      .from("council_search_index_jobs")
      .select("*")
      .eq("bill_id", missingJobFixture.bill.id)
      .maybeSingle();
    expect(missingJobAfter.error).toBeNull();
    expect(missingJobAfter.data).toBeNull();

    const existingJobFixture = await createPublishedBudgetFixture();
    const configuredJob = await adminClient
      .from("council_search_index_jobs")
      .update({
        status: "failed",
        attempt_count: 7,
        requested_at: "2001-02-03T04:05:06.000Z",
        available_at: "2099-02-03T04:05:06.000Z",
        locked_at: "2001-02-03T04:05:06.000Z",
        last_error: "再queueされていないことを確認する番兵",
      })
      .eq("bill_id", existingJobFixture.bill.id)
      .select("*")
      .single();
    if (configuredJob.error || !configuredJob.data) {
      throw new Error(`索引job初期化失敗: ${configuredJob.error?.message}`);
    }

    const existingJobResponse = await patchKnowledgeSource(
      validPatchBody(existingJobFixture, "索引jobを更新しない本文", {
        dry_run: false,
      })
    );
    const existingJobBody = await existingJobResponse.json();
    expect(existingJobResponse.status, JSON.stringify(existingJobBody)).toBe(
      200
    );

    const existingJobAfter = await adminClient
      .from("council_search_index_jobs")
      .select("*")
      .eq("bill_id", existingJobFixture.bill.id)
      .single();
    expect(existingJobAfter.error).toBeNull();
    expect(existingJobAfter.data).toEqual(configuredJob.data);
  });

  it("検索索引triggerはbillのINSERTと索引ソース列のUPDATEをenqueueする", async () => {
    const bill = await createTestBill({
      name: `検索索引正方向 ${randomUUID()}`,
    });
    billIds.push(bill.id);

    const insertedJob = await adminClient
      .from("council_search_index_jobs")
      .select("bill_id, status")
      .eq("bill_id", bill.id)
      .single();
    expect(insertedJob.error).toBeNull();
    expect(insertedJob.data).toMatchObject({
      bill_id: bill.id,
      status: "pending",
    });

    const { error: deleteError } = await adminClient
      .from("council_search_index_jobs")
      .delete()
      .eq("bill_id", bill.id);
    expect(deleteError).toBeNull();

    const { error: updateError } = await adminClient
      .from("bills")
      .update({ status_label: "代表列更新で再enqueue" })
      .eq("id", bill.id);
    expect(updateError).toBeNull();

    const updatedJob = await adminClient
      .from("council_search_index_jobs")
      .select("bill_id, status")
      .eq("bill_id", bill.id)
      .single();
    expect(updatedJob.error).toBeNull();
    expect(updatedJob.data).toMatchObject({
      bill_id: bill.id,
      status: "pending",
    });
  });

  it("同じ値へのcommitはDBを変更せずcacheを再検証する", async () => {
    const knowledgeSource = "すでに保存済みの本文";
    const fixture = await createPublishedBudgetFixture({ knowledgeSource });

    const response = await patchKnowledgeSource(
      validPatchBody(fixture, knowledgeSource, { dry_run: false })
    );
    const body = await response.json();
    const after = await readBillAndContents(fixture.bill.id);

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body).toMatchObject({
      success: true,
      dry_run: false,
      updated: false,
      would_update: false,
      warnings: [],
    });
    expect(body).not.toHaveProperty("knowledge_source");
    expect(JSON.stringify(body)).not.toContain(knowledgeSource);
    expect(after.bill.knowledge_source).toBe(knowledgeSource);
    expect(after.bill.updated_at).toBe(fixture.bill.updated_at);
    expect(cacheMocks.revalidateTag).toHaveBeenCalledOnce();
    expect(cacheMocks.revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.BILLS);
  });

  it("同じ値へのcommitでcache再検証が失敗したらwarningを返す", async () => {
    const knowledgeSource = "再検証失敗を検知する本文";
    const fixture = await createPublishedBudgetFixture({ knowledgeSource });
    const consoleWarning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    cacheMocks.revalidateTag.mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });

    try {
      const response = await patchKnowledgeSource(
        validPatchBody(fixture, knowledgeSource, { dry_run: false })
      );
      const body = await response.json();
      const after = await readBillAndContents(fixture.bill.id);

      expect(response.status, JSON.stringify(body)).toBe(200);
      expect(body).toMatchObject({
        success: true,
        dry_run: false,
        updated: false,
        would_update: false,
        warnings: [{ code: "cache_revalidation_failed" }],
      });
      expect(after.bill.knowledge_source).toBe(knowledgeSource);
      expect(after.bill.updated_at).toBe(fixture.bill.updated_at);
      expect(cacheMocks.revalidateTag).toHaveBeenCalledOnce();
      expect(consoleWarning).toHaveBeenCalledOnce();
    } finally {
      consoleWarning.mockRestore();
    }
  });

  it("staleなupdated_atは409で拒否して現在値を保つ", async () => {
    const fixture = await createPublishedBudgetFixture();

    const response = await patchKnowledgeSource(
      validPatchBody(fixture, "更新されない本文", {
        expected_updated_at: "2000-01-01T00:00:00.000Z",
      })
    );

    expect(response.status).toBe(409);
    const after = await readBillAndContents(fixture.bill.id);
    expect(after.bill.knowledge_source).toBeNull();
  });

  it("staleなナレッジSHA-256は409で拒否する", async () => {
    const fixture = await createPublishedBudgetFixture({
      knowledgeSource: "現在の本文",
    });

    const response = await patchKnowledgeSource(
      validPatchBody(fixture, "新しい本文", {
        expected_knowledge_source_sha256: sha256("別の本文"),
      })
    );

    expect(response.status).toBe(409);
    const after = await readBillAndContents(fixture.bill.id);
    expect(after.bill.knowledge_source).toBe("現在の本文");
  });

  it("投入したSHA-256を条件にnullへ安全にロールバックできる", async () => {
    const fixture = await createPublishedBudgetFixture();
    const candidate = "ロールバック対象本文";
    const commitResponse = await patchKnowledgeSource(
      validPatchBody(fixture, candidate, { dry_run: false })
    );
    const commitBody = await commitResponse.json();
    expect(commitResponse.status, JSON.stringify(commitBody)).toBe(200);

    const committed = await readBillAndContents(fixture.bill.id);
    const rollbackResponse = await patchKnowledgeSource({
      id: fixture.bill.id,
      expected_name: fixture.bill.name,
      diet_session_id: fixture.session.id,
      expected_updated_at: committed.bill.updated_at,
      expected_published_at: fixture.bill.published_at,
      expected_knowledge_source_sha256: sha256(candidate),
      knowledge_source: null,
      allow_clear: true,
      dry_run: false,
    });
    const rollbackBody = await rollbackResponse.json();
    const rolledBack = await readBillAndContents(fixture.bill.id);

    expect(rollbackResponse.status, JSON.stringify(rollbackBody)).toBe(200);
    expect(rollbackBody).toMatchObject({
      success: true,
      updated: true,
      candidate: {
        knowledge_source_sha256: null,
        knowledge_source_length: 0,
        knowledge_source_bytes: 0,
      },
      current: {
        knowledge_source_sha256: null,
        knowledge_source_length: 0,
        knowledge_source_bytes: 0,
      },
    });
    expect(rolledBack.bill.knowledge_source).toBeNull();
  });

  it("allow_clearなしのnull消去は400で拒否する", async () => {
    const knowledgeSource = "誤消去してはいけない本文";
    const fixture = await createPublishedBudgetFixture({ knowledgeSource });

    const response = await patchKnowledgeSource(
      validPatchBody(fixture, null, { dry_run: false })
    );
    const body = await response.json();
    const after = await readBillAndContents(fixture.bill.id);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      code: "knowledge_source_clear_not_allowed",
    });
    expect(after.bill.knowledge_source).toBe(knowledgeSource);
  });

  it("会期・公開状態・公開種別が対象外なら409で拒否する", async () => {
    const validFixture = await createPublishedBudgetFixture();
    const draftFixture = await createPublishedBudgetFixture({
      publishStatus: "draft",
    });
    const reportFixture = await createPublishedBudgetFixture({
      publicationCategory: "report",
    });

    const wrongSessionResponse = await patchKnowledgeSource(
      validPatchBody(validFixture, "会期不一致", {
        diet_session_id: randomUUID(),
      })
    );
    const draftResponse = await patchKnowledgeSource(
      validPatchBody(draftFixture, "draftは対象外")
    );
    const reportResponse = await patchKnowledgeSource(
      validPatchBody(reportFixture, "reportは対象外")
    );
    const wrongSessionGetResponse = await getKnowledgeSource({
      id: validFixture.bill.id,
      diet_session_id: randomUUID(),
    });
    const draftGetResponse = await getKnowledgeSource({
      id: draftFixture.bill.id,
      diet_session_id: draftFixture.session.id,
    });
    const reportGetResponse = await getKnowledgeSource({
      id: reportFixture.bill.id,
      diet_session_id: reportFixture.session.id,
    });

    for (const response of [
      wrongSessionResponse,
      draftResponse,
      reportResponse,
      wrongSessionGetResponse,
      draftGetResponse,
      reportGetResponse,
    ]) {
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({ success: false });
    }
  });

  it("正式タイトル・公開日時の不一致は409で拒否する", async () => {
    const fixture = await createPublishedBudgetFixture();

    const wrongNameResponse = await patchKnowledgeSource(
      validPatchBody(fixture, "タイトル不一致", {
        expected_name: "別の正式タイトル",
      })
    );
    const wrongPublishedAtResponse = await patchKnowledgeSource(
      validPatchBody(fixture, "公開日時不一致", {
        expected_published_at: "2000-01-01T00:00:00.000Z",
      })
    );

    expect(wrongNameResponse.status).toBe(409);
    expect(wrongPublishedAtResponse.status).toBe(409);
    const after = await readBillAndContents(fixture.bill.id);
    expect(after.bill.knowledge_source).toBeNull();
  });

  it("同じ読み取り時点からの並行PATCHは1件だけ成功する", async () => {
    const fixture = await createPublishedBudgetFixture();
    const [left, right] = await Promise.all([
      patchKnowledgeSource(
        validPatchBody(fixture, "並行更新A", { dry_run: false })
      ),
      patchKnowledgeSource(
        validPatchBody(fixture, "並行更新B", { dry_run: false })
      ),
    ]);
    const statuses = [left.status, right.status].sort((a, b) => a - b);

    expect(statuses).toEqual([200, 409]);
    const after = await readBillAndContents(fixture.bill.id);
    expect(["並行更新A", "並行更新B"]).toContain(after.bill.knowledge_source);
  });
});
