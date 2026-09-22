import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recordClick: vi.fn() }));

vi.mock("@/features/public-comment/shared/server/funnel-repository", () => ({
  recordEventInvitationClick: mocks.recordClick,
}));

import { GET } from "./route";

const formUrl = "https://forms.gle/sx7BdN5ZgWEk1cSKA";
const clickToken = "22222222-2222-4222-8222-222222222222";

describe("GET /events/youth-dialogue-2026-10-03/invite/[token]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordClick.mockResolvedValue("11111111-1111-4111-8111-111111111111");
  });

  it("メール内のクリックを記録し、AIインタビュー用フォームへ転送する", async () => {
    const response = await GET(
      new Request(
        `https://civictech-setagaya.org/events/youth-dialogue-2026-10-03/invite/${clickToken}`
      ),
      { params: Promise.resolve({ token: clickToken }) }
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(formUrl);
    expect(mocks.recordClick).toHaveBeenCalledExactlyOnceWith(clickToken);
  });

  it("トークンが不正でもイベント申込フォームへ案内する", async () => {
    const response = await GET(
      new Request(
        "https://civictech-setagaya.org/events/youth-dialogue-2026-10-03/invite/invalid"
      ),
      { params: Promise.resolve({ token: "invalid" }) }
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(formUrl);
    expect(mocks.recordClick).not.toHaveBeenCalled();
  });

  it("クリック記録に失敗してもフォームへ案内する", async () => {
    mocks.recordClick.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await GET(
      new Request(
        `https://civictech-setagaya.org/events/youth-dialogue-2026-10-03/invite/${clickToken}`
      ),
      { params: Promise.resolve({ token: clickToken }) }
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(formUrl);
  });
});
