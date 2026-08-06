import { describe, expect, it } from "vitest";
import {
  adminPublicationStatusLabel,
  billPublicationStatusLabel,
  splitAdminPublicationStatus,
  toAdminPublicationStatus,
} from "./admin-publication-status";

describe("admin publication status helpers", () => {
  it("DBの公開状態と公開カテゴリを管理画面の4択値へ変換する", () => {
    expect(toAdminPublicationStatus("draft", "budget")).toBe("draft");
    expect(toAdminPublicationStatus("published", "report")).toBe(
      "published_report"
    );
    expect(toAdminPublicationStatus("published", "general_question")).toBe(
      "published_general_question"
    );
    expect(toAdminPublicationStatus("published", "budget")).toBe(
      "published_budget"
    );
  });

  it("管理画面の4択値をDB保存値へ分解する", () => {
    expect(splitAdminPublicationStatus("draft")).toEqual({
      publish_status: "draft",
      publication_category: "report",
    });
    expect(splitAdminPublicationStatus("published_general_question")).toEqual({
      publish_status: "published",
      publication_category: "general_question",
    });
    expect(splitAdminPublicationStatus("published_budget")).toEqual({
      publish_status: "published",
      publication_category: "budget",
    });
    expect(splitAdminPublicationStatus("published_report")).toEqual({
      publish_status: "published",
      publication_category: "report",
    });
  });

  it("一覧表示用ラベルを返す", () => {
    expect(adminPublicationStatusLabel("published_report")).toBe(
      "公開（報告事項）"
    );
    expect(billPublicationStatusLabel("published", "budget")).toBe(
      "公開（予算）"
    );
    expect(billPublicationStatusLabel("coming_soon", "report")).toBe(
      "近日公開"
    );
  });
});
