import { describe, expect, it } from "vitest";
import {
  buildCouncilorDigestBody,
  buildCouncilorDigestSubject,
} from "./email-body";

describe("councilor digest email body", () => {
  it("builds a subject with item count", () => {
    expect(
      buildCouncilorDigestSubject({
        councilorName: "中里光夫",
        itemCount: 2,
      })
    ).toBe("【みらい議会】中里光夫議員宛の区民意見レポート（2件）");
  });

  it("includes contact only when provided", () => {
    const body = buildCouncilorDigestBody({
      councilorName: "中里光夫",
      items: [
        {
          reportId: "report-1",
          billTitle: "防災に関する質問",
          billUrl: "https://example.com/bills/1",
          summary: "防災情報を増やしてほしい。",
          stanceLabel: "期待・賛成",
          opinions: [{ title: "情報提供", content: "説明を増やすべき。" }],
          contactName: "山田太郎",
          contactEmail: "taro@example.com",
          createdAt: "2026-07-21T00:00:00.000Z",
        },
      ],
    });

    expect(body).toContain("山田太郎 <taro@example.com>");
    expect(body).toContain("防災情報を増やしてほしい。");
  });
});
