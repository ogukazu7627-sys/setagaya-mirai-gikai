import { describe, expect, it } from "vitest";
import { councilBillPageRequestSchema } from "./council-bill-page-schema";

const installationId = "11111111-1111-4111-8111-111111111111";

describe("councilBillPageRequestSchema", () => {
  it("フィルター検索とテーマページの入力を受け付ける", () => {
    expect(
      councilBillPageRequestSchema.safeParse({
        installationId,
        mode: "filters",
        contentType: "report",
        themeId: "education",
        committeeName: "文教常任委員会",
        page: 2,
      }).success
    ).toBe(true);
    expect(
      councilBillPageRequestSchema.safeParse({
        installationId,
        mode: "theme",
        year: 2025,
        themeId: "education",
        page: 1,
      }).success
    ).toBe(true);
  });

  it("未知のテーマ、範囲外ページ、余分な入力を拒否する", () => {
    expect(
      councilBillPageRequestSchema.safeParse({
        installationId,
        mode: "theme",
        year: 2025,
        themeId: "unknown",
        page: 1,
      }).success
    ).toBe(false);
    expect(
      councilBillPageRequestSchema.safeParse({
        installationId,
        mode: "filters",
        contentType: "all",
        themeId: "",
        committeeName: "",
        page: 0,
      }).success
    ).toBe(false);
    expect(
      councilBillPageRequestSchema.safeParse({
        installationId,
        mode: "theme",
        year: 2025,
        themeId: "education",
        page: 1,
        query: "保存しない検索文",
      }).success
    ).toBe(false);
  });
});
