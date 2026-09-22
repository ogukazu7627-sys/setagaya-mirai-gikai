import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createRedirect: vi.fn() }));

vi.mock("@/features/public-comment/shared/server/paid-social-redirect", () => ({
  createPaidSocialRedirect: mocks.createRedirect,
}));

import { GET } from "./route";

describe("GET /go/event/[campaign]/[content]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createRedirect.mockResolvedValue(new Response(null, { status: 307 }));
  });

  it("uses the October 3 event form as a tracked, immediate destination", async () => {
    const request = new Request(
      "https://civictech-setagaya.org/go/event/event-2026-10-03-wave2/creative-a"
    );

    await GET(request, {
      params: Promise.resolve({
        campaign: "event-2026-10-03-wave2",
        content: "creative-a",
      }),
    });

    expect(mocks.createRedirect).toHaveBeenCalledExactlyOnceWith({
      request,
      campaign: "event-2026-10-03-wave2",
      content: "creative-a",
      journeyType: "event_direct",
      adTheme: "event-direct",
      landingPath: "/external/google-form/event-direct",
      destinationUrl: "https://forms.gle/yJb9ivpgyBAi2iwS6",
    });
  });
});
