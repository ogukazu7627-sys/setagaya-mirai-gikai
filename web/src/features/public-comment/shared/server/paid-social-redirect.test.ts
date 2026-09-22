import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createVisit: vi.fn() }));

vi.mock("./funnel-repository", () => ({
  createShortLinkFunnelVisit: mocks.createVisit,
}));

import { createPaidSocialRedirect } from "./paid-social-redirect";

describe("createPaidSocialRedirect", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createVisit.mockResolvedValue("11111111-1111-4111-8111-111111111111");
  });

  it("InstagramのUTMと匿名の流入トークンを付けて遷移する", async () => {
    const response = await createPaidSocialRedirect({
      request: new Request(
        "https://civictech-setagaya.org/go/minpaku/event-2026-10-03-wave2/creative-a"
      ),
      campaign: "event-2026-10-03-wave2",
      content: "creative-a",
      journeyType: "interview",
      adTheme: "minpaku-2026",
      landingPath: "/public-comment/minpaku",
    });

    expect(response.status).toBe(307);
    const destination = new URL(response.headers.get("location") ?? "");
    expect(destination.pathname).toBe("/public-comment/minpaku");
    expect(destination.searchParams.get("utm_source")).toBe("instagram");
    expect(destination.searchParams.get("utm_medium")).toBe("paid_social");
    expect(destination.searchParams.get("utm_campaign")).toBe(
      "event-2026-10-03-wave2"
    );
    expect(destination.searchParams.get("utm_content")).toBe("creative-a");
    expect(destination.searchParams.get("attribution")).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.createVisit).toHaveBeenCalledExactlyOnceWith({
      journeyType: "interview",
      adTheme: "minpaku-2026",
      landingPath: "/public-comment/minpaku",
      utmCampaign: "event-2026-10-03-wave2",
      utmContent: "creative-a",
    });
  });

  it("URLに使えない広告識別子は保存せず404にする", async () => {
    const response = await createPaidSocialRedirect({
      request: new Request("https://civictech-setagaya.org/go/minpaku/x/y"),
      campaign: "invalid campaign",
      content: "creative-a",
      journeyType: "interview",
      adTheme: "minpaku-2026",
      landingPath: "/public-comment/minpaku",
    });

    expect(response.status).toBe(404);
    expect(mocks.createVisit).not.toHaveBeenCalled();
  });

  it("イベント広告は流入を記録してからGoogleフォームへ即時転送する", async () => {
    const response = await createPaidSocialRedirect({
      request: new Request(
        "https://civictech-setagaya.org/go/event/event-2026-10-03-wave2/creative-b"
      ),
      campaign: "event-2026-10-03-wave2",
      content: "creative-b",
      journeyType: "event_direct",
      adTheme: "event-direct",
      landingPath: "/external/google-form/event-direct",
      destinationUrl: "https://forms.gle/yJb9ivpgyBAi2iwS6",
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://forms.gle/yJb9ivpgyBAi2iwS6"
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.createVisit).toHaveBeenCalledExactlyOnceWith({
      journeyType: "event_direct",
      adTheme: "event-direct",
      landingPath: "/external/google-form/event-direct",
      utmCampaign: "event-2026-10-03-wave2",
      utmContent: "creative-b",
    });
  });

  it("計測保存に失敗してもイベント広告はフォームへ転送する", async () => {
    mocks.createVisit.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await createPaidSocialRedirect({
      request: new Request(
        "https://civictech-setagaya.org/go/event/event-2026-10-03-wave2/creative-a"
      ),
      campaign: "event-2026-10-03-wave2",
      content: "creative-a",
      journeyType: "event_direct",
      adTheme: "event-direct",
      landingPath: "/external/google-form/event-direct",
      destinationUrl: "https://forms.gle/yJb9ivpgyBAi2iwS6",
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://forms.gle/yJb9ivpgyBAi2iwS6"
    );
  });
});
