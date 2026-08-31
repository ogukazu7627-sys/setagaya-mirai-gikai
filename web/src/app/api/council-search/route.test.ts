import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchCouncilBillsByKeyword: vi.fn(),
  consumeAnonymousRateLimit: vi.fn(),
}));

vi.mock(
  "@/features/bills/server/services/council-keyword-search-service",
  () => ({
    searchCouncilBillsByKeyword: mocks.searchCouncilBillsByKeyword,
  })
);
vi.mock("@/lib/api/anonymous-rate-limit", () => ({
  consumeAnonymousRateLimit: mocks.consumeAnonymousRateLimit,
}));

import { POST } from "./route";

const validBody = {
  installationId: "11111111-1111-4111-8111-111111111111",
  query: "防災について教えて",
  contentType: "all",
  themeId: "",
  committeeName: "",
};

describe("POST /api/council-search", () => {
  beforeEach(() => {
    mocks.searchCouncilBillsByKeyword.mockReset();
    mocks.consumeAnonymousRateLimit.mockReset();
    mocks.consumeAnonymousRateLimit.mockResolvedValue(true);
    mocks.searchCouncilBillsByKeyword.mockResolvedValue({
      items: [],
      total: 1,
    });
  });

  it("ログインなしで同一オリジンの匿名検索を受け付ける", async () => {
    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.searchCouncilBillsByKeyword).toHaveBeenCalledWith(validBody);
    expect(await response.json()).toEqual({
      items: [],
      total: 1,
    });
  });

  it("異なるオリジン、200文字超、16KiB超を拒否する", async () => {
    const wrongOrigin = await POST(
      createRequest(validBody, { origin: "https://example.com" })
    );
    expect(wrongOrigin.status).toBe(403);

    const longQuery = await POST(
      createRequest({ ...validBody, query: "防".repeat(201) })
    );
    expect(longQuery.status).toBe(400);

    const oversized = await POST(
      createRequest({ ...validBody, padding: "x".repeat(17 * 1024) })
    );
    expect(oversized.status).toBe(413);
    expect(mocks.searchCouncilBillsByKeyword).not.toHaveBeenCalled();
  });

  it("端末またはIPの上限到達時は429を返す", async () => {
    mocks.consumeAnonymousRateLimit.mockResolvedValue(false);

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(429);
    expect(mocks.searchCouncilBillsByKeyword).not.toHaveBeenCalled();
  });

  it("内部エラー時も検索文をレスポンスへ含めない", async () => {
    mocks.searchCouncilBillsByKeyword.mockRejectedValue(
      new Error("database failed")
    );

    const response = await POST(createRequest(validBody));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain(validBody.query);
  });
});

function createRequest(
  body: unknown,
  options: { origin?: string } = {}
): Request {
  return new Request("http://localhost:3000/api/council-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? "http://localhost:3000",
      "x-forwarded-for": "192.0.2.10",
    },
    body: JSON.stringify(body),
  });
}
