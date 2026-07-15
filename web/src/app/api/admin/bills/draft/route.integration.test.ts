import { randomUUID } from "node:crypto";
import {
  adminClient,
  cleanupTestBill,
  createTestBill,
  createTestPreviewToken,
} from "@test-utils/utils";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { GET, POST } from "./route";

const councilorRepositoryMock = vi.hoisted(() => ({
  findUnknownCouncilorNamesByBillId: vi.fn(),
  syncCouncilorBillStatements: vi.fn(),
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

vi.mock(
  "@/features/councilors/server/repositories/councilor-statement-repository",
  () => councilorRepositoryMock
);

const ADMIN_API_TOKEN = "test-admin-api-token";

type DraftApiResponse = {
  success: boolean;
  mode?: "created" | "updated";
  billId?: string;
  adminEditUrl?: string;
  previewUrl?: string;
  unknownCouncilorNames?: string[];
  forcedFields?: {
    publish_status: "draft";
    is_review_completed: false;
  };
  error?: string;
  code?: string;
};

type DraftReadApiResponse = DraftApiResponse & {
  draft?: {
    id: string;
    name: string;
    item_type: string;
    major_category: string;
    diet_session_id: string | null;
    submitted_date: string | null;
    status: string;
    status_label: string | null;
    status_note: string | null;
    publish_status: "draft";
    is_review_completed: false;
    is_featured: boolean;
    interview_enabled: boolean;
    use_knowledge_source_in_chat: boolean;
    thumbnail_url: string | null;
    share_thumbnail_url: string | null;
    normal_title: string;
    normal_summary: string;
    normal_content: string;
    hard_title: string | null;
    hard_summary: string | null;
    hard_content: string | null;
    tag_ids: string[];
    tags: Array<{ id: string; label: string; major_category: string | null }>;
    sources: Array<{
      title: string;
      url: string | null;
      source_type: string;
      published_at: string | null;
      accessed_at: string | null;
    }>;
    knowledge_source: string | null;
  };
};

const billIds: string[] = [];

function validDraftBody(overrides: Record<string, unknown> = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `AI下書きテスト ${suffix}`,
    item_type: "question",
    major_category: "防災☔",
    status: "introduced",
    status_label: "質問・答弁済み",
    submitted_date: "2026-02-15",
    normal_title: `AI下書きタイトル ${suffix}`,
    normal_summary: "AI下書きの概要です。",
    normal_content:
      "# 概要\n\n本文です。\n\n# 議員、会派の意見\n\n## 公明党世田谷区議団\n\n防災について確認しました。",
    sources: [
      {
        title: "公式資料",
        url: "https://example.com/source",
        source_type: "official_page",
        published_at: "2026-02-01",
        accessed_at: "2026-02-15",
      },
    ],
    ...overrides,
  };
}

async function postDraft(
  body: unknown,
  token: string | null = ADMIN_API_TOKEN
): Promise<Response> {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return POST(
    new Request("http://localhost/api/admin/bills/draft", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

async function getDraft(
  id: string | null,
  token: string | null = ADMIN_API_TOKEN
): Promise<Response> {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const url = id
    ? `http://localhost/api/admin/bills/draft?id=${encodeURIComponent(id)}`
    : "http://localhost/api/admin/bills/draft";
  return GET(
    new Request(url, {
      method: "GET",
      headers,
    })
  );
}

describe("/api/admin/bills/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { adminApiToken?: string }).adminApiToken = ADMIN_API_TOKEN;
    councilorRepositoryMock.findUnknownCouncilorNamesByBillId.mockResolvedValue(
      []
    );
    councilorRepositoryMock.syncCouncilorBillStatements.mockResolvedValue({
      statementCount: 0,
      unknownCouncilorNames: [],
    });
  });

  afterAll(async () => {
    await Promise.all(billIds.map((billId) => cleanupTestBill(billId)));
  });

  it("ADMIN_API_TOKEN 未設定時は500を返す", async () => {
    (env as { adminApiToken?: string }).adminApiToken = undefined;

    const res = await postDraft(validDraftBody());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "admin_api_token_not_configured",
    });
  });

  it("tokenなし・不一致は401を返す", async () => {
    const missingTokenRes = await postDraft(validDraftBody(), null);
    expect(missingTokenRes.status).toBe(401);

    const badTokenRes = await postDraft(validDraftBody(), "bad-token");
    expect(badTokenRes.status).toBe(401);
  });

  it("不正なJSONは400を返す", async () => {
    const res = await postDraft("{");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "invalid_json",
    });
  });

  it("最小JSONで新規draft案件を作成し、hard本文とpreview tokenも作成する", async () => {
    const res = await postDraft(validDraftBody());
    const body = (await res.json()) as DraftApiResponse;

    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body).toMatchObject({
      success: true,
      mode: "created",
      forcedFields: {
        publish_status: "draft",
        is_review_completed: false,
      },
    });
    expect(body.billId).toBeTruthy();
    expect(body.adminEditUrl).toContain(`/admin/bills/${body.billId}/edit`);
    expect(body.previewUrl).toContain(`/preview/bills/${body.billId}`);
    if (!body.billId) throw new Error("billId was not returned");
    billIds.push(body.billId);

    const { data: bill } = await adminClient
      .from("bills")
      .select("publish_status, is_review_completed, sources, submitted_date")
      .eq("id", body.billId)
      .single();
    expect(bill?.publish_status).toBe("draft");
    expect(bill?.is_review_completed).toBe(false);
    expect(bill?.submitted_date?.slice(0, 10)).toBe("2026-02-15");
    expect(bill?.sources).toEqual([
      {
        title: "公式資料",
        url: "https://example.com/source",
        source_type: "official_page",
        published_at: "2026-02-01",
        accessed_at: "2026-02-15",
      },
    ]);

    const { data: contents } = await adminClient
      .from("bill_contents")
      .select("difficulty_level, title, summary, content")
      .eq("bill_id", body.billId);
    const normal = contents?.find(
      (content) => content.difficulty_level === "normal"
    );
    const hard = contents?.find(
      (content) => content.difficulty_level === "hard"
    );
    expect(normal).toBeDefined();
    expect(hard).toMatchObject({
      title: normal?.title,
      summary: normal?.summary,
      content: normal?.content,
    });

    const { data: tokens } = await adminClient
      .from("preview_tokens")
      .select("token")
      .eq("bill_id", body.billId);
    expect(tokens).toHaveLength(1);

    expect(
      councilorRepositoryMock.syncCouncilorBillStatements
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        billId: body.billId,
        normalContent: expect.stringContaining("# 議員、会派の意見"),
      })
    );
  });

  it("既存draft案件は更新でき、既存preview tokenは維持する", async () => {
    const bill = await createTestBill({ publish_status: "draft" });
    billIds.push(bill.id);
    await createTestPreviewToken(bill.id, {
      token: `stable-token-${Date.now()}`,
    });

    const res = await postDraft(
      validDraftBody({
        id: bill.id,
        name: "更新されたAI下書き",
        normal_title: "更新後タイトル",
      })
    );
    const body = (await res.json()) as DraftApiResponse;

    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body.mode).toBe("updated");
    expect(body.billId).toBe(bill.id);

    const { data: tokens } = await adminClient
      .from("preview_tokens")
      .select("token")
      .eq("bill_id", bill.id);
    expect(tokens).toHaveLength(1);
    expect(body.previewUrl).toContain(tokens?.[0]?.token);

    const { data: updatedBill } = await adminClient
      .from("bills")
      .select("name, publish_status, is_review_completed")
      .eq("id", bill.id)
      .single();
    expect(updatedBill).toMatchObject({
      name: "更新されたAI下書き",
      publish_status: "draft",
      is_review_completed: false,
    });
  });

  it("期限切れpreview tokenがあるdraft更新ではtoken文字列を維持して期限だけ延長する", async () => {
    const bill = await createTestBill({ publish_status: "draft" });
    billIds.push(bill.id);
    const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const token = await createTestPreviewToken(bill.id, {
      token: `expired-stable-token-${Date.now()}`,
      expires_at: expiredAt,
    });

    const res = await postDraft(validDraftBody({ id: bill.id }));
    const body = (await res.json()) as DraftApiResponse;

    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body.previewUrl).toContain(token.token);

    const { data: updatedToken } = await adminClient
      .from("preview_tokens")
      .select("token, expires_at")
      .eq("id", token.id)
      .single();
    expect(updatedToken?.token).toBe(token.token);
    expect(new Date(updatedToken?.expires_at ?? 0).getTime()).toBeGreaterThan(
      Date.now()
    );
  });

  it("draft以外の既存案件更新は409で拒否する", async () => {
    const publishedBill = await createTestBill({ publish_status: "published" });
    const comingSoonBill = await createTestBill({
      publish_status: "coming_soon",
    });
    billIds.push(publishedBill.id, comingSoonBill.id);

    const publishedRes = await postDraft(
      validDraftBody({ id: publishedBill.id })
    );
    expect(publishedRes.status).toBe(409);

    const comingSoonRes = await postDraft(
      validDraftBody({ id: comingSoonBill.id })
    );
    expect(comingSoonRes.status).toBe(409);
  });

  it("存在しないidは404を返す", async () => {
    const res = await postDraft(validDraftBody({ id: randomUUID() }));

    expect(res.status).toBe(404);
  });

  it("公開化・レビュー完了化の入力は400で拒否する", async () => {
    const publishRes = await postDraft(
      validDraftBody({ publish_status: "published" })
    );
    expect(publishRes.status).toBe(400);

    const reviewRes = await postDraft(
      validDraftBody({ is_review_completed: true })
    );
    expect(reviewRes.status).toBe(400);
  });

  it("タグが4件以上なら400で拒否する", async () => {
    const res = await postDraft(
      validDraftBody({
        tag_ids: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
      })
    );

    expect(res.status).toBe(400);
  });

  it("GETでもADMIN_API_TOKEN未設定時は500を返す", async () => {
    (env as { adminApiToken?: string }).adminApiToken = undefined;

    const res = await getDraft(randomUUID());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "admin_api_token_not_configured",
    });
  });

  it("GETのtokenなし・不一致は401を返す", async () => {
    const missingTokenRes = await getDraft(randomUUID(), null);
    expect(missingTokenRes.status).toBe(401);

    const badTokenRes = await getDraft(randomUUID(), "bad-token");
    expect(badTokenRes.status).toBe(401);
  });

  it("GETでidなし・不正idは400を返す", async () => {
    const missingIdRes = await getDraft(null);
    expect(missingIdRes.status).toBe(400);
    await expect(missingIdRes.json()).resolves.toMatchObject({
      success: false,
      code: "missing_id",
    });

    const invalidIdRes = await getDraft("not-a-uuid");
    expect(invalidIdRes.status).toBe(400);
    await expect(invalidIdRes.json()).resolves.toMatchObject({
      success: false,
      code: "invalid_id",
    });
  });

  it("GETで既存draft案件をPOSTへ再利用しやすいJSONとして読み取れる", async () => {
    const createRes = await postDraft(
      validDraftBody({
        name: "読み取り対象AI下書き",
        status_note: "区から追加説明あり",
        thumbnail_url: "https://example.com/thumb.jpg",
        share_thumbnail_url: "https://example.com/share.jpg",
        knowledge_source: "AIチャット用の補足資料本文です。",
        is_featured: true,
        interview_enabled: true,
        use_knowledge_source_in_chat: true,
        normal_title: "読み取り対象タイトル",
        normal_summary: "読み取り対象概要",
        normal_content: "# 概要\n\n読み取り対象本文です。",
        hard_title: "詳しい読み取り対象タイトル",
        hard_summary: "詳しい読み取り対象概要",
        hard_content: "# 詳細\n\n詳しい読み取り対象本文です。",
      })
    );
    const createBody = (await createRes.json()) as DraftApiResponse;
    expect(createRes.status, JSON.stringify(createBody)).toBe(200);
    if (!createBody.billId) throw new Error("billId was not returned");
    billIds.push(createBody.billId);

    const readRes = await getDraft(createBody.billId);
    const readBody = (await readRes.json()) as DraftReadApiResponse;

    expect(readRes.status, JSON.stringify(readBody)).toBe(200);
    expect(readBody).toMatchObject({
      success: true,
      billId: createBody.billId,
      previewUrl: createBody.previewUrl,
      forcedFields: {
        publish_status: "draft",
        is_review_completed: false,
      },
      draft: {
        id: createBody.billId,
        name: "読み取り対象AI下書き",
        item_type: "question",
        major_category: "防災☔",
        submitted_date: "2026-02-15",
        status: "introduced",
        status_label: "質問・答弁済み",
        status_note: "区から追加説明あり",
        publish_status: "draft",
        is_review_completed: false,
        is_featured: true,
        interview_enabled: true,
        use_knowledge_source_in_chat: true,
        thumbnail_url: "https://example.com/thumb.jpg",
        share_thumbnail_url: "https://example.com/share.jpg",
        normal_title: "読み取り対象タイトル",
        normal_summary: "読み取り対象概要",
        normal_content: "# 概要\n\n読み取り対象本文です。",
        hard_title: "詳しい読み取り対象タイトル",
        hard_summary: "詳しい読み取り対象概要",
        hard_content: "# 詳細\n\n詳しい読み取り対象本文です。",
        tag_ids: [],
        tags: [],
        sources: [
          {
            title: "公式資料",
            url: "https://example.com/source",
            source_type: "official_page",
            published_at: "2026-02-01",
            accessed_at: "2026-02-15",
          },
        ],
        knowledge_source: "AIチャット用の補足資料本文です。",
      },
    });

    const updateRes = await postDraft({
      ...readBody.draft,
      normal_summary: "読み取り後に追記した概要",
    });
    const updateBody = (await updateRes.json()) as DraftApiResponse;

    expect(updateRes.status, JSON.stringify(updateBody)).toBe(200);
    expect(updateBody).toMatchObject({
      success: true,
      mode: "updated",
      billId: createBody.billId,
      previewUrl: createBody.previewUrl,
    });
  });

  it("GETでdraft以外の既存案件読み取りは409で拒否する", async () => {
    const publishedBill = await createTestBill({ publish_status: "published" });
    billIds.push(publishedBill.id);

    const res = await getDraft(publishedBill.id);

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "non_draft_read_not_allowed",
      billId: publishedBill.id,
    });
  });

  it("GETで存在しないidは404を返す", async () => {
    const res = await getDraft(randomUUID());

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "bill_not_found",
    });
  });
});
