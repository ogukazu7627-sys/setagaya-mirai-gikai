import "server-only";

import { CouncilorXPostsCarousel } from "../../client/components/councilor-x-posts-carousel";
import type { PublicCouncilorXPost } from "../../shared/types/councilor-x-post";

type CouncilorXPostsSectionProps = {
  posts: PublicCouncilorXPost[];
};

export function CouncilorXPostsSection({ posts }: CouncilorXPostsSectionProps) {
  return (
    <section aria-labelledby="councilor-x-posts-heading" className="space-y-6">
      <header className="space-y-2">
        <h2
          id="councilor-x-posts-heading"
          className="text-2xl font-bold text-mirai-text md:text-3xl"
        >
          世田谷区議会議員の最新発信
        </h2>
        <p className="text-sm leading-7 text-mirai-text-secondary md:text-base">
          世田谷区議会議員のX投稿を、新しい順に掲載しています。
        </p>
      </header>

      {posts.length > 0 ? (
        <CouncilorXPostsCarousel posts={posts} />
      ) : (
        <p className="border-t border-mirai-border py-8 text-sm text-mirai-text-muted">
          最新の投稿を準備しています。
        </p>
      )}
    </section>
  );
}
