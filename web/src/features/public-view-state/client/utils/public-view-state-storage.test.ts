// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildPublicViewUrl,
  isRestorablePublicPath,
  readComponentState,
  readPrimaryDestination,
  readScrollPosition,
  writeComponentState,
  writePrimaryDestination,
  writeScrollPosition,
} from "./public-view-state-storage";

describe("public view state storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("クエリを含むページURLを安定して組み立てる", () => {
    expect(buildPublicViewUrl("/bills", "type=report&page=2")).toBe(
      "/bills?type=report&page=2"
    );
    expect(buildPublicViewUrl("/councilors", "")).toBe("/councilors");
  });

  it("公開閲覧ページだけをスクロール復元対象にする", () => {
    expect(isRestorablePublicPath("/councilors/councilor-id")).toBe(true);
    expect(isRestorablePublicPath("/budget/questions/education")).toBe(true);
    expect(isRestorablePublicPath("/admin/bills")).toBe(false);
    expect(isRestorablePublicPath("/report-problem")).toBe(false);
    expect(isRestorablePublicPath("/bills/bill-id/interview/chat")).toBe(false);
    expect(isRestorablePublicPath("/report/report-id/complete")).toBe(false);
    expect(isRestorablePublicPath("/report/report-id")).toBe(true);
    expect(isRestorablePublicPath("/report/report-id/chat-log")).toBe(true);
  });

  it("ページ単位のスクロール位置を保存して復元する", () => {
    writeScrollPosition("/councilors?party=group", 321.6);

    expect(readScrollPosition("/councilors?party=group")).toBe(322);
    expect(readScrollPosition("/councilors")).toBeNull();
  });

  it("主要ページのクエリ付きURLだけを復帰先として保存する", () => {
    writePrimaryDestination("council", "/bills", "/bills?type=report&page=2");
    expect(readPrimaryDestination("council", "/bills")).toBe(
      "/bills?type=report&page=2"
    );

    writePrimaryDestination(
      "council",
      "/bills",
      "/bills/bill-id?difficulty=hard"
    );
    expect(readPrimaryDestination("council", "/bills")).toBe(
      "/bills?type=report&page=2"
    );
  });

  it("外部URLを主要ナビゲーションの復帰先にしない", () => {
    writePrimaryDestination(
      "budget",
      "/budget",
      "https://example.com/budget?category=education"
    );

    expect(readPrimaryDestination("budget", "/budget")).toBe("/budget");
  });

  it("検証済みのコンポーネント状態だけを読み戻す", () => {
    writeComponentState("example", { page: 3 });
    const isPageState = (value: unknown): value is { page: number } =>
      typeof value === "object" &&
      value !== null &&
      typeof (value as { page?: unknown }).page === "number";

    expect(readComponentState("example", isPageState)).toEqual({ page: 3 });
    expect(
      readComponentState(
        "example",
        (value): value is { category: string } =>
          typeof value === "object" &&
          value !== null &&
          typeof (value as { category?: unknown }).category === "string"
      )
    ).toBeNull();
  });
});
