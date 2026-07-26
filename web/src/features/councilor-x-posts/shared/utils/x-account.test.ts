import { describe, expect, it } from "vitest";
import { buildXPostUrl, extractXUsername, isValidXId } from "./x-account";

describe("extractXUsername", () => {
  it("Xと旧TwitterのプロフィールURLからユーザー名を取り出す", () => {
    expect(extractXUsername("https://x.com/RisaKamio")).toBe("RisaKamio");
    expect(extractXUsername("https://twitter.com/ogino_kenji/")).toBe(
      "ogino_kenji"
    );
  });

  it("プロフィールURLでない値や不正なユーザー名を拒否する", () => {
    expect(extractXUsername("http://x.com/example")).toBeNull();
    expect(extractXUsername("https://example.com/example")).toBeNull();
    expect(extractXUsername("https://x.com/name-too-long-for-x")).toBeNull();
    expect(extractXUsername("not-a-url")).toBeNull();
  });
});

describe("buildXPostUrl", () => {
  it("公式投稿URLを組み立てる", () => {
    expect(buildXPostUrl("RisaKamio", "1234567890123456789")).toBe(
      "https://x.com/RisaKamio/status/1234567890123456789"
    );
  });

  it("不正な入力を拒否する", () => {
    expect(() => buildXPostUrl("bad-name", "123")).toThrow();
    expect(() => buildXPostUrl("valid_name", "not-a-post-id")).toThrow();
  });
});

describe("isValidXId", () => {
  it("1桁から19桁までの数字だけを受け入れる", () => {
    expect(isValidXId("1")).toBe(true);
    expect(isValidXId("1234567890123456789")).toBe(true);
    expect(isValidXId("")).toBe(false);
    expect(isValidXId("12345678901234567890")).toBe(false);
    expect(isValidXId("123x")).toBe(false);
  });
});
