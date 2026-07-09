import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { Hero } from "@/components/top/hero";
import { TeamMirai } from "@/components/top/team-mirai";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { BillsByMajorCategorySection } from "@/features/bills/client/components/bill-list/bills-by-major-category-section";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { FiscalYearArchiveSection } from "@/features/bills/server/components/fiscal-year-archive-section";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import type { BillWithContent } from "@/features/bills/shared/types";
import { HomeChatClient } from "@/features/chat/client/components/home-chat-client";
import { CurrentDietSession } from "@/features/diet-sessions/client/components/current-diet-session";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { getJapanTime } from "@/lib/utils/date";

type HomeProps = {
  searchParams?: Promise<{
    archive_year?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const now = getJapanTime();
  const { billsByMajorCategory, featuredBills, archiveData } =
    await loadHomeData({
      currentDate: now,
      archiveYear: params?.archive_year,
    });

  // ゆくゆくタグ機能がマージされたらBFFに統合する
  const [currentSession, currentDifficulty] = await Promise.all([
    getCurrentDietSession(now),
    getDifficultyLevel(),
  ]);

  const toBillChatContext = (bill: BillWithContent) => {
    return {
      name: `${bill.bill_content?.title}（${bill.name}）`,
      summary: bill.bill_content?.summary,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBills.some((b) => b.id === bill.id),
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

      {/* 本日の世田谷区議会セクション */}
      <CurrentDietSession session={currentSession} />

      {/* 議案一覧セクション */}
      <Container className="">
        <div className="py-10">
          <main className="flex flex-col gap-16">
            {/* 注目の案件セクション */}
            <FeaturedBillSection bills={featuredBills} />

            {/* テーマ別案件一覧セクション */}
            <BillsByMajorCategorySection
              billsByMajorCategory={billsByMajorCategory}
            />
          </main>
        </div>
      </Container>

      {/* 前年度以前の世田谷区議会セクション */}
      {archiveData.years.length > 0 && (
        <div className="bg-mirai-surface-muted py-10">
          <Container>
            <FiscalYearArchiveSection archiveData={archiveData} />
          </Container>
        </div>
      )}

      <Container>
        {/* みらい議会とは セクション */}
        <About />

        {/* 参考にしたプロジェクト セクション */}
        <TeamMirai />

        {/* 掲載コンテンツについて */}
        <BillDisclaimer />
      </Container>

      {/* チャット機能 */}
      <HomeChatClient
        currentDifficulty={currentDifficulty}
        bills={uniqueBillsForChat.map(toBillChatContext)}
      />
    </>
  );
}
