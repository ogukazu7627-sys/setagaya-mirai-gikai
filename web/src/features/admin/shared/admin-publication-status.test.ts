import { describe, expect, it } from "vitest";
import {
  adminPublicationStatusLabel,
  billPublicationStatusLabel,
  publicationCategoryLabel,
  splitAdminPublicationStatus,
  toAdminPublicationStatus,
} from "./admin-publication-status";

describe("admin publication status helpers", () => {
  it("DBの公開状態を管理画面の2択値へ変換する", () => {
    expect(toAdminPublicationStatus("draft")).toBe("draft");
    expect(toAdminPublicationStatus("coming_soon")).toBe("draft");
    expect(toAdminPublicationStatus("published")).toBe("published");
  });

  it("管理画面の2択値をDB保存値へ分解する", () => {
    expect(splitAdminPublicationStatus("draft")).toEqual({
      publish_status: "draft",
    });
    expect(splitAdminPublicationStatus("published")).toEqual({
      publish_status: "published",
    });
  });

  it("一覧表示用ラベルを返す", () => {
    expect(adminPublicationStatusLabel("published")).toBe("公開");
    expect(billPublicationStatusLabel("published")).toBe("公開");
    expect(billPublicationStatusLabel("coming_soon")).toBe("近日公開");
  });

  it("公開種別のラベルを返す", () => {
    expect(publicationCategoryLabel("general_question")).toBe("一般質問");
    expect(publicationCategoryLabel("budget")).toBe("予算");
    expect(publicationCategoryLabel("report")).toBe("報告事項");
    expect(publicationCategoryLabel("unknown")).toBe("報告事項");
  });
});
