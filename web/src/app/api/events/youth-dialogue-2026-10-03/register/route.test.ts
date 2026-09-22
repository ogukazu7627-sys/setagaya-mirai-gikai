import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/events/youth-dialogue-2026-10-03/register", () => {
  it("サイト内の申込情報を受け付けず、Googleフォームを案内する", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "イベント申込はGoogleフォームからお手続きください",
    });
  });
});
