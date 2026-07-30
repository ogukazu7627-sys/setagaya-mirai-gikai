import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchBudgetPrograms: vi.fn(),
  consumeAnonymousRateLimit: vi.fn(),
}));

vi.mock("@/features/budget/server/services/budget-query-service", () => ({
  searchBudgetPrograms: mocks.searchBudgetPrograms,
}));
vi.mock("@/lib/api/anonymous-rate-limit", () => ({
  consumeAnonymousRateLimit: mocks.consumeAnonymousRateLimit,
}));

import { POST } from "./route";

const validBody = {
  installationId: "11111111-1111-4111-8111-111111111111",
  query: "子育て",
};

describe("POST /api/budget/search", () => {
  beforeEach(() => {
    mocks.searchBudgetPrograms.mockReset();
    mocks.consumeAnonymousRateLimit.mockReset();
    mocks.consumeAnonymousRateLimit.mockResolvedValue(true);
    mocks.searchBudgetPrograms.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  it("同一オリジンの匿名検索を既定条件付きで受け付ける", async () => {
    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.searchBudgetPrograms).toHaveBeenCalledWith({
      query: "子育て",
      fiscalYear: null,
      accountCode: null,
      includeZeroAmount: false,
      page: 1,
      pageSize: 20,
    });
  });

  it("異なるオリジン、長すぎる検索語、過大payloadを拒否する", async () => {
    const wrongOrigin = await POST(
      createRequest(validBody, { origin: "https://example.com" })
    );
    expect(wrongOrigin.status).toBe(403);

    const longQuery = await POST(
      createRequest({ ...validBody, query: "予".repeat(101) })
    );
    expect(longQuery.status).toBe(400);

    const oversized = await POST(
      createRequest({ ...validBody, padding: "x".repeat(17 * 1024) })
    );
    expect(oversized.status).toBe(413);
    expect(mocks.searchBudgetPrograms).not.toHaveBeenCalled();
  });

  it("端末またはIPの上限到達時は429を返す", async () => {
    mocks.consumeAnonymousRateLimit.mockResolvedValue(false);

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(429);
    expect(mocks.searchBudgetPrograms).not.toHaveBeenCalled();
  });

  it("内部エラー時も検索語をレスポンスやログへ含めない", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.searchBudgetPrograms.mockRejectedValue(new Error("database failed"));

    const response = await POST(createRequest(validBody));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain(validBody.query);
    expect(consoleError).toHaveBeenCalledWith(
      "Budget search API request failed"
    );
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain(
      validBody.query
    );
    consoleError.mockRestore();
  });
});

function createRequest(
  body: unknown,
  options: { origin?: string } = {}
): Request {
  return new Request("http://localhost:3000/api/budget/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? "http://localhost:3000",
      "x-forwarded-for": "192.0.2.10",
    },
    body: JSON.stringify(body),
  });
}
