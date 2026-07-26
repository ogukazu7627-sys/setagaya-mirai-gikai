type OrderedXPost = {
  postId: string;
  postedAt: string;
};

export type XPostBootstrapPageState = {
  accountKey: string;
  nextToken: string | null;
  oldestFetchedPost: OrderedXPost | null;
};

export function sortXPostsNewestFirst<T extends OrderedXPost>(
  posts: readonly T[]
): T[] {
  return [...posts].sort(compareXPostRecency);
}

export function deduplicateXPosts<T extends OrderedXPost>(
  posts: readonly T[]
): T[] {
  return Array.from(new Map(posts.map((post) => [post.postId, post])).values());
}

export function findBootstrapAccountsToContinue(
  pages: readonly XPostBootstrapPageState[],
  posts: readonly OrderedXPost[],
  targetCount = 50
): string[] {
  const pagesWithMore = pages.filter((page) => page.nextToken);
  if (pagesWithMore.length === 0) {
    return [];
  }

  const orderedPosts = sortXPostsNewestFirst(deduplicateXPosts(posts));
  if (orderedPosts.length < targetCount) {
    return pagesWithMore.map((page) => page.accountKey);
  }

  const cutoff = orderedPosts[targetCount - 1];
  if (!cutoff) {
    return pagesWithMore.map((page) => page.accountKey);
  }

  return pagesWithMore
    .filter(
      (page) =>
        !page.oldestFetchedPost ||
        compareXPostRecency(page.oldestFetchedPost, cutoff) <= 0
    )
    .map((page) => page.accountKey);
}

function compareXPostRecency(a: OrderedXPost, b: OrderedXPost): number {
  const timeDifference =
    new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  if (timeDifference !== 0) {
    return timeDifference;
  }

  return compareNumericStringsDescending(a.postId, b.postId);
}

function compareNumericStringsDescending(a: string, b: string): number {
  if (a.length !== b.length) {
    return b.length - a.length;
  }
  return b.localeCompare(a);
}
