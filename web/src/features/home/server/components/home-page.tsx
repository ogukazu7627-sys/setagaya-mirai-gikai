import "server-only";

import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { Hero } from "@/components/top/hero";
import { TeamMirai } from "@/components/top/team-mirai";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import type { BillWithContent } from "@/features/bills/shared/types";
import { HomeChatClient } from "@/features/chat/client/components/home-chat-client";
import { CouncilorXPostsSection } from "@/features/councilor-x-posts/server/components/councilor-x-posts-section";
import { loadLatestCouncilorXPosts } from "@/features/councilor-x-posts/server/loaders/load-latest-councilor-x-posts";
import { RecommendedCouncilorsSection } from "@/features/councilors/server/components/recommended-councilors-section";
import { loadRecommendedCouncilors } from "@/features/councilors/server/loaders/load-councilor-directory";
import { CurrentDietSession } from "@/features/diet-sessions/client/components/current-diet-session";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { TodayRecommendationsSection } from "@/features/recommendations/client/components/today-recommendations-section";
import { getRecommendationAvailability } from "@/features/recommendations/server/services/recommendation-availability-service";
import { getJapanTime } from "@/lib/utils/date";

export async function HomePage() {
  const now = getJapanTime();
  const [
    { billsByMajorCategory, featuredBills },
    currentSession,
    currentDifficulty,
    recommendationAvailability,
    councilors,
    councilorXPosts,
  ] = await Promise.all([
    loadHomeData({
      currentDate: now,
    }),
    getCurrentDietSession(now),
    getDifficultyLevel(),
    getRecommendationAvailability(),
    loadRecommendedCouncilorsSafely(now),
    loadLatestCouncilorXPostsSafely(),
  ]);

  const toBillChatContext = (bill: BillWithContent) => {
    return {
      name: `${bill.bill_content?.title}（${bill.name}）`,
      summary: bill.bill_content?.summary,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBills.some(
        (featuredBill) => featuredBill.id === bill.id
      ),
    };
  };
  const uniqueBillsForChat = Array.from(
    new Map(
      billsByMajorCategory
        .flatMap((category) => category.bills)
        .concat(featuredBills)
        .map((bill) => [bill.id, bill])
    ).values()
  );

  return (
    <>
      <Hero />

      <CurrentDietSession session={currentSession} />

      <TodayRecommendationsSection availability={recommendationAvailability} />

      <Container>
        <div className="py-10">
          <main className="flex flex-col gap-16">
            <FeaturedBillSection bills={featuredBills} />

            <RecommendedCouncilorsSection councilors={councilors} />
          </main>
        </div>
      </Container>

      <div className="bg-mirai-surface-muted py-10 md:py-14">
        <Container>
          <CouncilorXPostsSection posts={councilorXPosts} />
        </Container>
      </div>

      <Container>
        <About />
        <TeamMirai />
      </Container>

      <HomeChatClient
        currentDifficulty={currentDifficulty}
        bills={uniqueBillsForChat.map(toBillChatContext)}
      />
    </>
  );
}

async function loadRecommendedCouncilorsSafely(currentDate: Date) {
  try {
    return await loadRecommendedCouncilors(currentDate);
  } catch (error) {
    console.error("Failed to load recommended councilors for home", error);
    return [];
  }
}

async function loadLatestCouncilorXPostsSafely() {
  try {
    return await loadLatestCouncilorXPosts();
  } catch {
    console.error("Failed to load councilor X posts for home");
    return [];
  }
}
