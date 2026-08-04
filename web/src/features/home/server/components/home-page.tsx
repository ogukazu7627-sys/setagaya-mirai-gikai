import "server-only";

import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { Hero } from "@/components/top/hero";
import { TeamMirai } from "@/components/top/team-mirai";
import { MobileDifficultySelector } from "@/features/bill-difficulty/client/components/mobile-difficulty-selector";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import { HomeBudgetPromo } from "@/features/budget/server/components/home-budget-promo";
import { CouncilorXPostsSection } from "@/features/councilor-x-posts/server/components/councilor-x-posts-section";
import { loadLatestCouncilorXPosts } from "@/features/councilor-x-posts/server/loaders/load-latest-councilor-x-posts";
import { RecommendedCouncilorsSection } from "@/features/councilors/server/components/recommended-councilors-section";
import { loadRecommendedCouncilors } from "@/features/councilors/server/loaders/load-councilor-directory";
import { CurrentDietSession } from "@/features/diet-sessions/client/components/current-diet-session";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { TodayRecommendationsSection } from "@/features/recommendations/client/components/today-recommendations-section";
import { getJapanTime } from "@/lib/utils/date";

export async function HomePage() {
  const now = getJapanTime();
  const [
    { featuredBills },
    currentSession,
    currentDifficulty,
    councilors,
    councilorXPosts,
  ] = await Promise.all([
    loadHomeData({
      currentDate: now,
    }),
    getCurrentDietSession(now),
    getDifficultyLevel(),
    loadRecommendedCouncilorsSafely(now),
    loadLatestCouncilorXPostsSafely(),
  ]);

  return (
    <>
      <Hero />

      <Container className="flex justify-end py-3 min-[768px]:hidden">
        <MobileDifficultySelector currentLevel={currentDifficulty} />
      </Container>

      <CurrentDietSession session={currentSession} />

      <TodayRecommendationsSection currentDifficulty={currentDifficulty} />

      <HomeBudgetPromo />

      <Container>
        <div className="py-10">
          <main className="flex flex-col gap-16">
            <FeaturedBillSection bills={featuredBills} />

            <RecommendedCouncilorsSection councilors={councilors} />
          </main>
        </div>
      </Container>

      <div className="bg-mirai-surface py-10 md:py-14">
        <Container>
          <CouncilorXPostsSection posts={councilorXPosts} />
        </Container>
      </div>

      <Container>
        <About />
        <TeamMirai />
      </Container>
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
