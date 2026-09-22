import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recordClick: vi.fn() }));

vi.mock("@/features/public-comment/shared/server/funnel-repository", () => ({
  recordEventSignupLinkClick: mocks.recordClick,
}));

import { GET } from "./route";

const formUrl = "https://forms.gle/yJb9ivpgyBAi2iwS6";
const publicToken = "11111111-1111-4111-8111-111111111111";

describe("GET /events/youth-dialogue-2026-10-03/apply", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordClick.mockResolvedValue(publicToken);
  });

  it("フォーム遷移を記録して、イベント単体用フォームへ転送する", async () => {
    const response = await GET(
      new Request(
        `https://civictech-setagaya.org/events/youth-dialogue-2026-10-03/apply?attribution=${publicToken}`
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(formUrl);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.recordClick).toHaveBeenCalledExactlyOnceWith(publicToken);
  });

  it("流入トークンがない場合は記録せずフォームへ転送する", async () => {
    const response = await GET(
      new Request(
        "https://civictech-setagaya.org/events/youth-dialogue-2026-10-03/apply"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(formUrl);
    expect(mocks.recordClick).not.toHaveBeenCalled();
  });

  it("計測保存に失敗してもフォームへ転送する", async () => {
    mocks.recordClick.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await GET(
      new Request(
        `https://civictech-setagaya.org/events/youth-dialogue-2026-10-03/apply?attribution=${publicToken}`
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(formUrl);
  });
});
