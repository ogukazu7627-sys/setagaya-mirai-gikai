import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ arrive: vi.fn() }));

vi.mock("@/features/public-comment/shared/server/funnel-repository", () => ({
  arrivePublicCommentFunnelVisit: mocks.arrive,
}));

import { POST } from "./route";

describe("POST /api/public-comment/funnel/visit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.arrive.mockResolvedValue("11111111-1111-4111-8111-111111111111");
  });

  it("ページ読込とUTMを匿名トークンに記録する", async () => {
    const response = await POST(
      new Request("http://localhost/api/public-comment/funnel/visit", {
        method: "POST",
        body: JSON.stringify({
          publicToken: "22222222-2222-4222-8222-222222222222",
          journeyType: "interview",
          adTheme: "minpaku-2026",
          landingPath: "/public-comment/minpaku",
          utmSource: "instagram",
          utmMedium: "paid_social",
          utmCampaign: "event-2026-10-03-wave2",
          utmContent: "creative-a",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.arrive).toHaveBeenCalledExactlyOnceWith({
      publicToken: "22222222-2222-4222-8222-222222222222",
      journeyType: "interview",
      adTheme: "minpaku-2026",
      landingPath: "/public-comment/minpaku",
      utmSource: "instagram",
      utmMedium: "paid_social",
      utmCampaign: "event-2026-10-03-wave2",
      utmContent: "creative-a",
    });
    await expect(response.json()).resolves.toEqual({
      publicToken: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("外部URLをlandingPathとして受け付けない", async () => {
    const response = await POST(
      new Request("http://localhost/api/public-comment/funnel/visit", {
        method: "POST",
        body: JSON.stringify({
          journeyType: "event_direct",
          adTheme: "event-direct",
          landingPath: "https://example.com",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.arrive).not.toHaveBeenCalled();
  });
});
