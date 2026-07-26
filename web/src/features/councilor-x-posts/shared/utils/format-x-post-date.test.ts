import { describe, expect, it } from "vitest";
import { formatXPostDate } from "./format-x-post-date";

describe("formatXPostDate", () => {
  it("X投稿日時を日本時間で表示する", () => {
    expect(formatXPostDate("2026-07-27T00:30:00.000Z")).toBe(
      "2026年7月27日 09:30"
    );
  });

  it("不正な日時へ安全な表示を返す", () => {
    expect(formatXPostDate("invalid")).toBe("投稿日時不明");
  });
});
