import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ register: vi.fn(), rateLimit: vi.fn() }));

vi.mock("@/features/public-comment/shared/server/funnel-repository", () => ({
  registerYouthDialogueEvent: mocks.register,
}));
vi.mock("@/lib/api/anonymous-rate-limit", () => ({
  consumeAnonymousRateLimit: mocks.rateLimit,
}));

import { POST } from "./route";

const publicToken = "11111111-1111-4111-8111-111111111111";

function request(extra: Record<string, unknown> = {}) {
  return new Request(
    "http://localhost/api/events/youth-dialogue-2026-10-03/register",
    {
      method: "POST",
      body: JSON.stringify({
        publicToken,
        attendeeName: "世田谷 みらい",
        email: "mirai@example.test",
        interests: ["民泊", "民泊", "防災"],
        agreementsAccepted: true,
        note: "車いすで参加します",
        website: "",
        ...extra,
      }),
    }
  );
}

describe("POST /api/events/youth-dialogue-2026-10-03/register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.rateLimit.mockResolvedValue(true);
    mocks.register.mockResolvedValue("22222222-2222-4222-8222-222222222222");
  });

  it("同じ関心項目をまとめて、流入トークンと一緒に申込を保存する", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.register).toHaveBeenCalledExactlyOnceWith({
      publicToken,
      attendeeName: "世田谷 みらい",
      email: "mirai@example.test",
      interests: ["民泊", "防災"],
      agreementVersion: "2026-09-22-v1",
      note: "車いすで参加します",
    });
    await expect(response.json()).resolves.toEqual({
      registrationId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("約束への同意がなければ保存しない", async () => {
    const response = await POST(request({ agreementsAccepted: false }));

    expect(response.status).toBe(400);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("送信上限を超えたら保存しない", async () => {
    mocks.rateLimit.mockResolvedValue(false);
    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
