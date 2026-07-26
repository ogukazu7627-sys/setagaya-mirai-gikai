import type { CouncilorXPostType } from "../types/councilor-x-post";
import { isValidXId } from "./x-account";

export type XApiPost = {
  id: string;
  createdAt: string;
  referencedPostTypes: string[];
};

export type EligibleXApiPost = {
  postId: string;
  postedAt: string;
  postType: CouncilorXPostType;
};

export function toEligibleXApiPost(post: XApiPost): EligibleXApiPost | null {
  if (
    !isValidXId(post.id) ||
    Number.isNaN(new Date(post.createdAt).getTime()) ||
    post.referencedPostTypes.some(
      (type) => type === "replied_to" || type === "retweeted"
    )
  ) {
    return null;
  }

  return {
    postId: post.id,
    postedAt: new Date(post.createdAt).toISOString(),
    postType: post.referencedPostTypes.includes("quoted")
      ? "quote"
      : "original",
  };
}
