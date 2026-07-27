import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadCouncilBillPage: vi.fn(),
  consumeAnonymousRateLimit: vi.fn(),
}));

vi.mock("@/features/bills/server/services/council-bill-page-service", () => ({
  loadCouncilBillPage: mocks.loadCouncilBillPage,
}));
vi.mock("@/lib/api/anonymous-rate-limit", () => ({
  consumeAnonymousRateLimit: mocks.consumeAnonymousRateLimit,
}));

import { POST } from "./route";

const validBody = {
  installationId: "11111111-1111-4111-8111-111111111111",
  mode: "theme",
  year: 2026,
  themeId: "education",
  page: 1,
};

describe("POST /api/council-bills", () => {
  beforeEach(() => {
    mocks.loadCouncilBillPage.mockReset();
    mocks.consumeAnonymousRateLimit.mockReset();
    mocks.consumeAnonymousRateLimit.mockResolvedValue(true);
    mocks.loadCouncilBillPage.mockResolvedValue({
      bills: [],
      total: 0,
      currentPage: 1,
      totalPages: 1,
    });
  });

  it("同一オリジンの匿名ページ取得を受け付ける", async () => {
    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.loadCouncilBillPage).toHaveBeenCalledWith(validBody);
    expect(await response.json()).toEqual({
      bills: [],
      total: 0,
      currentPage: 1,
      totalPages: 1,
    });
  });

  it("異なるオリジンと不正なページを拒否する", async () => {
    expect(
      (await POST(createRequest(validBody, "https://example.com"))).status
    ).toBe(403);
    expect((await POST(createRequest({ ...validBody, page: 0 }))).status).toBe(
      400
    );
    expect(mocks.loadCouncilBillPage).not.toHaveBeenCalled();
  });

  it("上限到達時は429を返す", async () => {
    mocks.consumeAnonymousRateLimit.mockResolvedValue(false);

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(429);
    expect(mocks.loadCouncilBillPage).not.toHaveBeenCalled();
  });
});

function createRequest(
  body: unknown,
  origin = "http://localhost:3000"
): Request {
  return new Request("http://localhost:3000/api/council-bills", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "x-forwarded-for": "192.0.2.10",
    },
    body: JSON.stringify(body),
  });
}
