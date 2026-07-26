import "server-only";

import { findLatestCouncilorXPosts } from "../repositories/councilor-x-post-repository";

export async function loadLatestCouncilorXPosts() {
  return findLatestCouncilorXPosts(50);
}
