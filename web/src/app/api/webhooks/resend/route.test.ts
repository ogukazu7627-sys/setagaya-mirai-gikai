import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), update: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: mocks.verify };
  },
}));
vi.mock("@/features/public-comment/shared/server/funnel-repository", () => ({
  updateEventInvitationDelivery: mocks.update,
}));

import { POST } from "./route";

function webhookRequest() {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: {
      "svix-id": "msg_1",
      "svix-timestamp": "1770000000",
      "svix-signature": "v1,signature",
    },
    body: '{"signed":true}',
  });
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
    mocks.verify.mockReturnValue({
      type: "email.delivered",
      data: { email_id: "resend-email-1" },
    });
    mocks.update.mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it("署名済みの配信イベントを案内メールに反映する", async () => {
    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledExactlyOnceWith({
      payload: '{"signed":true}',
      headers: {
        id: "msg_1",
        timestamp: "1770000000",
        signature: "v1,signature",
      },
      webhookSecret: "whsec_test",
    });
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
      providerId: "resend-email-1",
      status: "delivered",
    });
  });

  it("署名検証に失敗したイベントは保存しない", async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
