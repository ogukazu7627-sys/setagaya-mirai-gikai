import { ArrowRight, Landmark } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { BillsByMajorCategorySection } from "@/features/bills/client/components/bill-list/bills-by-major-category-section";
import { CouncilSearchSection } from "@/features/bills/client/components/bill-list/council-search-section";
import { YearArchiveSection } from "@/features/bills/server/components/year-archive-section";
import type { CouncilSearchInitialFilters } from "@/features/bills/shared/types/council-search";
import { buildCouncilSearchCommitteeDocuments } from "@/features/bills/shared/utils/build-council-search-documents";
import { CouncilChatClient } from "@/features/chat/client/components/council-chat-client";
import { findActivePublicCommittees } from "@/features/committees/server/repositories/committee-directory-repository";
import { CurrentDietSession } from "@/features/diet-sessions/client/components/current-diet-session";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { routes } from "@/lib/routes";
import { getJapanTime } from "@/lib/utils/date";
import { loadBillsDirectoryData } from "../loaders/load-bills-directory-data";

type BillsDirectoryPageProps = {
  initialSearch?: CouncilSearchInitialFilters;
  archiveYear?: string | string[];
};

export async function BillsDirectoryPage({
  initialSearch,
  archiveYear,
}: BillsDirectoryPageProps) {
  const now = getJapanTime();
  const [
    {
      currentBills,
      billsByMajorCategory,
      searchDocuments,
      difficultyLevel,
      archiveData,
    },
    currentSession,
    committees,
  ] = await Promise.all([
    loadBillsDirectoryData(now, archiveYear),
    getCurrentDietSession(now),
    findActivePublicCommittees(),
  ]);
  const committeeSearchDocuments =
    buildCouncilSearchCommitteeDocuments(committees);

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-primary-accent">世田谷区議会</p>
          <h1 className="text-3xl font-bold text-mirai-text">議会</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-mirai-text-secondary">
            世田谷区議会で扱われている議案、質問、請願・陳情、報告事項を確認できます。
          </p>
        </div>
      </Container>

      <CurrentDietSession session={currentSession} />

      <Container className="py-8 sm:py-10">
        <div className="flex flex-col gap-12">
          <CouncilSearchSection
            documents={[...committeeSearchDocuments, ...searchDocuments]}
            initialFilters={initialSearch}
          />

          <section aria-labelledby="committee-entry-title">
            <Link
              href={routes.committees() as Route}
              className="group flex min-h-20 items-center gap-4 rounded-lg border border-mirai-border bg-white p-4 transition-colors hover:bg-mirai-surface-gray"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mirai-gradient text-mirai-text">
                <Landmark aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  id="committee-entry-title"
                  className="block text-base font-bold text-mirai-text"
                >
                  委員会を見る
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-mirai-text-secondary">
                  役割と、実際に話し合われている案件を確認できます。
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 text-primary-accent"
              />
            </Link>
          </section>

          {billsByMajorCategory.length > 0 ? (
            <BillsByMajorCategorySection
              billsByMajorCategory={billsByMajorCategory}
              title="案件をテーマから探す"
              description="今年の会期に属する公開済み案件を、テーマごとに表示しています。"
            />
          ) : (
            <section className="rounded-lg border border-mirai-border bg-white p-6">
              <h2 className="text-lg font-bold text-mirai-text">
                公開中の案件はありません
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-mirai-text-secondary">
                新しい案件が公開されると、ここに表示されます。
              </p>
            </section>
          )}
        </div>
      </Container>

      {archiveData.years.length > 0 && (
        <div className="bg-mirai-surface-muted py-10">
          <Container>
            <YearArchiveSection archiveData={archiveData} basePath="/bills" />
          </Container>
        </div>
      )}

      <CouncilChatClient
        currentDifficulty={difficultyLevel}
        bills={currentBills.map((bill) => ({
          id: bill.id,
          name: `${bill.bill_content?.title || bill.name}（${bill.name}）`,
          summary: bill.bill_content?.summary || undefined,
          tags: bill.tags.map((tag) => tag.label),
        }))}
      />
    </div>
  );
}
