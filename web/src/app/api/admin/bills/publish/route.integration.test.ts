import { randomUUID } from "node:crypto";
import {
  adminClient,
  cleanupTestBill,
  createTestBill,
  createTestBillContent,
} from "@test-utils/utils";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { POST } from "./route";

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

type PublishApiResponse = {
  success: boolean;
  billId?: string;
  previousPublishStatus?: "draft";
  publish_status?: "published";
  is_review_completed?: boolean;
  publishedAt?: string;
  adminEditUrl?: string;
  publicUrl?: string;
  unknownCouncilorNames?: string[];
  error?: string;
  code?: string;
};

const billIds: string[] = [];

async function postPublish(
  body: unknown,
  token: string | null = ADMIN_API_TOKEN
): Promise<Response> {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return POST(
    new Request("http://localhost/api/admin/bills/publish", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

async function createDraftBillWithNormalContent(
  billOverrides: Parameters<typeof createTestBill>[0] = {},
  contentOverrides: Parameters<typeof createTestBillContent>[1] = {}
) {
  const bill = await createTestBill({
    publish_status: "draft",
    ...billOverrides,
  });
  billIds.push(bill.id);
  await createTestBillContent(bill.id, {
    difficulty_level: "normal",
    title: "公開APIテストタイトル",
    summary: "公開APIテスト概要",
    content: "# 概要\n\n公開APIテスト本文です。",
    ...contentOverrides,
  });
  return bill;
}

describe("/api/admin/bills/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { adminApiToken?: string }).adminApiToken = ADMIN_API_TOKEN;
    councilorRepositoryMock.findUnknownCouncilorNamesByBillId.mockResolvedValue(
      []
    );
  });

  afterAll(async () => {
    await Promise.all(billIds.map((billId) => cleanupTestBill(billId)));
  });

  it("ADMIN_API_TOKEN未設定時は500を返す", async () => {
    (env as { adminApiToken?: string }).adminApiToken = undefined;

    const res = await postPublish({ id: randomUUID() });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "admin_api_token_not_configured",
    });
  });

  it("tokenなし・不一致は401を返す", async () => {
    const missingTokenRes = await postPublish({ id: randomUUID() }, null);
    expect(missingTokenRes.status).toBe(401);

    const badTokenRes = await postPublish({ id: randomUUID() }, "bad-token");
    expect(badTokenRes.status).toBe(401);
  });

  it("不正なJSONは400を返す", async () => {
    const res = await postPublish("{");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "invalid_json",
    });
  });

  it("draft案件を公開し、必要ならレビュー完了にもできる", async () => {
    const bill = await createDraftBillWithNormalContent();

    const res = await postPublish({
      id: bill.id,
      is_review_completed: true,
    });
    const body = (await res.json()) as PublishApiResponse;

    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body).toMatchObject({
      success: true,
      billId: bill.id,
      previousPublishStatus: "draft",
      publish_status: "published",
      is_review_completed: true,
      unknownCouncilorNames: [],
    });
    expect(body.adminEditUrl).toContain(`/admin/bills/${bill.id}/edit`);
    expect(body.publicUrl).toContain(`/bills/${bill.id}`);
    expect(body.publishedAt).toBeTruthy();

    const { data: updatedBill } = await adminClient
      .from("bills")
      .select("publish_status, is_review_completed, published_at")
      .eq("id", bill.id)
      .single();
    expect(updatedBill).toMatchObject({
      publish_status: "published",
      is_review_completed: true,
    });
    expect(updatedBill?.published_at).toBeTruthy();
  });

  it("レビュー完了指定がない場合は既存値を維持する", async () => {
    const bill = await createDraftBillWithNormalContent({
      is_featured: true,
    });

    const res = await postPublish({ id: bill.id });
    const body = (await res.json()) as PublishApiResponse;

    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body.is_review_completed).toBe(false);
  });

  it("存在しないidは404を返す", async () => {
    const res = await postPublish({ id: randomUUID() });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "bill_not_found",
    });
  });

  it("draft以外の案件は409で拒否する", async () => {
    const publishedBill = await createDraftBillWithNormalContent({
      publish_status: "published",
    });
    const comingSoonBill = await createDraftBillWithNormalContent({
      publish_status: "coming_soon",
    });

    const publishedRes = await postPublish({ id: publishedBill.id });
    expect(publishedRes.status).toBe(409);

    const comingSoonRes = await postPublish({ id: comingSoonBill.id });
    expect(comingSoonRes.status).toBe(409);
  });

  it("normal本文がないdraft案件は409で拒否する", async () => {
    const bill = await createTestBill({ publish_status: "draft" });
    billIds.push(bill.id);

    const res = await postPublish({ id: bill.id });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      code: "public_content_missing",
    });
  });

  it("publish_statusにpublished以外を指定すると400で拒否する", async () => {
    const res = await postPublish({
      id: randomUUID(),
      publish_status: "draft",
    });

    expect(res.status).toBe(400);
  });
});
