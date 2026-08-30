import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  syncBillSeoProfileSafely: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/env", () => ({
  env: { adminApiToken: "secret" },
}));
vi.mock("@/features/bill-seo/server/services/generate-bill-seo", () => ({
  syncBillSeoProfileSafely: mocks.syncBillSeoProfileSafely,
}));

import { POST } from "./route";

const BILL_ID = "11111111-1111-4111-8111-111111111111";

describe("/api/admin/bills/seo/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncBillSeoProfileSafely.mockResolvedValue({
      status: "ready",
      profile: { billId: BILL_ID },
      warning: null,
    });
  });

  it("Bearer tokenと案件IDでSEOを強制再生成する", async () => {
    const response = await post({ id: BILL_ID }, "secret");

    expect(response.status).toBe(200);
    expect(mocks.syncBillSeoProfileSafely).toHaveBeenCalledWith(BILL_ID, {
      force: true,
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("bills");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      billId: BILL_ID,
      seoGeneration: { status: "ready" },
    });
  });

  it("token不一致は401、不正IDは400を返す", async () => {
    expect((await post({ id: BILL_ID }, "wrong")).status).toBe(401);
    expect((await post({ id: "not-uuid" }, "secret")).status).toBe(400);
  });

  it("生成失敗は警告を保持して502を返す", async () => {
    mocks.syncBillSeoProfileSafely.mockResolvedValue({
      status: "failed",
      profile: null,
      warning: "生成に失敗しました",
    });

    const response = await post({ id: BILL_ID }, "secret");

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      seoGeneration: { status: "failed", warning: "生成に失敗しました" },
    });
  });
});

function post(body: unknown, token: string) {
  return POST(
    new Request("http://localhost/api/admin/bills/seo/regenerate", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })
  );
}
