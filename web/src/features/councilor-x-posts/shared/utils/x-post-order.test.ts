import { describe, expect, it } from "vitest";
import {
  deduplicateXPosts,
  findBootstrapAccountsToContinue,
  sortXPostsNewestFirst,
} from "./x-post-order";

const post = (postId: string, hour: number) => ({
  postId,
  postedAt: `2026-07-27T${String(hour).padStart(2, "0")}:00:00.000Z`,
});

describe("X投稿の並び順", () => {
  it("投稿日時の降順、同時刻では投稿IDの降順に並べる", () => {
    expect(
      sortXPostsNewestFirst([post("9", 8), post("11", 9), post("10", 9)]).map(
        ({ postId }) => postId
      )
    ).toEqual(["11", "10", "9"]);
  });

  it("投稿IDで重複を除外する", () => {
    expect(
      deduplicateXPosts([post("10", 8), post("10", 9), post("11", 10)])
    ).toHaveLength(2);
  });
});

describe("findBootstrapAccountsToContinue", () => {
  it("50件未満なら次ページがある全アカウントを続行する", () => {
    expect(
      findBootstrapAccountsToContinue(
        [
          {
            accountKey: "a",
            nextToken: "next-a",
            oldestFetchedPost: post("10", 8),
          },
          {
            accountKey: "b",
            nextToken: null,
            oldestFetchedPost: post("9", 7),
          },
        ],
        [post("10", 8)],
        2
      )
    ).toEqual(["a"]);
  });

  it("50件目より古い次ページしかないアカウントは止める", () => {
    expect(
      findBootstrapAccountsToContinue(
        [
          {
            accountKey: "new",
            nextToken: "next-new",
            oldestFetchedPost: post("100", 9),
          },
          {
            accountKey: "old",
            nextToken: "next-old",
            oldestFetchedPost: post("50", 5),
          },
        ],
        [post("100", 10), post("90", 8), post("80", 7)],
        2
      )
    ).toEqual(["new"]);
  });
});
