import { describe, expect, it, vi } from "vitest";

// @ts-expect-error Vitest supports virtual mocks for Next's server-only marker.
vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { parseBillFormData } from "./bill-admin-form";

describe("parseBillFormData", () => {
  it("一般質問は簡素化した入力から公開データを自動補完する", () => {
    const formData = new FormData();
    formData.set("publish_status", "published");
    formData.set("publication_category", "general_question");
    formData.set("name", "区立学校の情報公開に関する一般質問");
    formData.set("major_category", "教育🏫");
    formData.set("submitted_date", "2026-08-24");
    formData.set(
      "normal_content",
      "# 具体的な内容\n\n区立学校の取り組みをわかりやすく公開するよう求めました。"
    );
    formData.set("knowledge_source", "会議録原文");

    // 非表示項目が送られても一般質問用の値を優先する。
    formData.set("item_type", "bill");
    formData.set("status", "rejected");
    formData.set("status_label", "否決");
    formData.set("normal_title", "使われない表示タイトル");
    formData.set("normal_summary", "使われない概要");
    formData.set("hard_content", "使われないhard本文");

    const result = parseBillFormData(formData);

    expect(result).toMatchObject({
      name: "区立学校の情報公開に関する一般質問",
      item_type: "question",
      major_category: "教育🏫",
      status: "introduced",
      publish_status: "published",
      publication_category: "general_question",
      submitted_date: "2026-08-24",
      status_label: "質問・答弁済み",
      status_note: null,
      thumbnail_url: null,
      share_thumbnail_url: null,
      knowledge_source: "会議録原文",
      is_review_completed: false,
      is_featured: false,
      normal_title: "区立学校の情報公開に関する一般質問",
      normal_content:
        "# 具体的な内容\n\n区立学校の取り組みをわかりやすく公開するよう求めました。",
      hard_title: null,
      hard_content: null,
      tag_ids: [],
      new_tags: [],
      sources: [],
    });
    expect(result.normal_summary).toContain(
      "区立学校の取り組みをわかりやすく公開"
    );
  });

  it("既存案件を一般質問として保存しても非表示データを維持する", () => {
    const formData = new FormData();
    formData.set("publish_status", "draft");
    formData.set("publication_category", "general_question");
    formData.set("name", "区立学校の情報公開に関する一般質問");
    formData.set("major_category", "教育🏫");
    formData.set("normal_content", "# 具体的な内容\n\n本文");
    formData.set("preserved_status_note", "文教常任委員会で報告済み");
    formData.set("preserved_thumbnail_url", "https://example.com/thumb.jpg");
    formData.set(
      "preserved_share_thumbnail_url",
      "https://example.com/share.jpg"
    );
    formData.set("preserved_is_review_completed", "true");
    formData.set("preserved_is_featured", "true");
    formData.append(
      "preserved_tag_ids",
      "11111111-1111-4111-8111-111111111111"
    );
    formData.set("preserved_source_0_title", "世田谷区議会会議録");
    formData.set("preserved_source_0_url", "https://example.com/source");
    formData.set("preserved_source_0_source_type", "official_minutes");
    formData.set("preserved_source_0_published_at", "2026-08-01");
    formData.set("preserved_source_0_accessed_at", "2026-08-24");

    const result = parseBillFormData(formData);

    expect(result).toMatchObject({
      status_note: "文教常任委員会で報告済み",
      thumbnail_url: "https://example.com/thumb.jpg",
      share_thumbnail_url: "https://example.com/share.jpg",
      is_review_completed: true,
      is_featured: true,
      tag_ids: ["11111111-1111-4111-8111-111111111111"],
      sources: [
        {
          title: "世田谷区議会会議録",
          url: "https://example.com/source",
          source_type: "official_minutes",
          published_at: "2026-08-01",
          accessed_at: "2026-08-24",
        },
      ],
    });
  });
});
