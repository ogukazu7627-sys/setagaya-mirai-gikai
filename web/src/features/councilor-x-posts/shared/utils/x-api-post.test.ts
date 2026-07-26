import { describe, expect, it } from "vitest";
import { toEligibleXApiPost } from "./x-api-post";

describe("toEligibleXApiPost", () => {
  const basePost = {
    id: "1234567890123456789",
    createdAt: "2026-07-27T09:00:00.000Z",
    referencedPostTypes: [] as string[],
  };

  it("通常投稿と引用投稿を受け付ける", () => {
    expect(toEligibleXApiPost(basePost)).toMatchObject({
      postType: "original",
    });
    expect(
      toEligibleXApiPost({
        ...basePost,
        referencedPostTypes: ["quoted"],
      })
    ).toMatchObject({ postType: "quote" });
  });

  it("返信と単純リポストを除外する", () => {
    expect(
      toEligibleXApiPost({
        ...basePost,
        referencedPostTypes: ["replied_to"],
      })
    ).toBeNull();
    expect(
      toEligibleXApiPost({
        ...basePost,
        referencedPostTypes: ["retweeted"],
      })
    ).toBeNull();
  });

  it("不正な投稿IDと日時を除外する", () => {
    expect(toEligibleXApiPost({ ...basePost, id: "invalid" })).toBeNull();
    expect(
      toEligibleXApiPost({ ...basePost, createdAt: "invalid-date" })
    ).toBeNull();
  });
});
