import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Landmark,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillCard } from "@/features/bills/client/components/bill-list/bill-card";
import {
  COMMITTEE_KIND_LABELS,
  COMMITTEE_OFFICIAL_AGENDA_URL,
  COMMITTEE_OFFICIAL_OVERVIEW_URL,
  getCommitteeProfile,
} from "@/features/committees/shared/committee-profiles";
import { routes } from "@/lib/routes";
import { getJapanTime } from "@/lib/utils/date";
import { loadCommitteeBills } from "../loaders/load-committee-bills";
import { findActivePublicCommitteeById } from "../repositories/committee-directory-repository";

type CommitteeDetailPageProps = {
  committeeId: string;
};

export async function CommitteeDetailPage({
  committeeId,
}: CommitteeDetailPageProps) {
  const [committee, difficultyLevel] = await Promise.all([
    findActivePublicCommitteeById(committeeId),
    getDifficultyLevel(),
  ]);
  if (!committee) {
    notFound();
  }

  const profile = getCommitteeProfile(committee.name);
  const relatedBills = await loadCommitteeBills(
    committee.name,
    difficultyLevel,
    getJapanTime()
  );
  const committeeSearchHref = `/bills?committee=${encodeURIComponent(
    committee.name
  )}`;

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <nav
          aria-label="パンくず"
          className="flex min-h-11 flex-wrap items-center gap-1 text-sm font-bold"
        >
          <Link
            href={routes.bills() as Route}
            className="text-mirai-text-secondary hover:text-primary-accent"
          >
            議会
          </Link>
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-mirai-text-secondary"
          />
          <Link
            href={routes.committees() as Route}
            className="text-mirai-text-secondary hover:text-primary-accent"
          >
            委員会
          </Link>
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-mirai-text-secondary"
          />
          <span aria-current="page" className="text-mirai-text">
            詳細
          </span>
        </nav>

        <header className="mt-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mirai-gradient text-mirai-text">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <p className="text-sm font-bold text-primary-accent">
              {COMMITTEE_KIND_LABELS[profile.kind]}
            </p>
          </div>
          <h1 className="mt-4 text-2xl font-bold leading-relaxed text-mirai-text sm:text-3xl">
            {committee.name}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mirai-text-secondary">
            {profile.summary}
          </p>
        </header>

        <section
          aria-labelledby="committee-responsibilities-title"
          className="mt-10 border-t border-mirai-border pt-8"
        >
          <h2
            id="committee-responsibilities-title"
            className="text-xl font-bold text-mirai-text"
          >
            この委員会が話し合うこと
          </h2>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profile.responsibilities.map((responsibility) => (
              <li
                key={responsibility}
                className="flex min-h-12 items-start gap-3 border-b border-mirai-border pb-3 text-sm font-medium leading-relaxed text-mirai-text"
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary-accent"
                />
                {responsibility}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="committee-bills-title"
          className="mt-12 border-t border-mirai-border pt-8"
        >
          <div className="flex items-start gap-3">
            <FileText
              aria-hidden="true"
              className="mt-1 size-5 shrink-0 text-primary-accent"
            />
            <div>
              <h2
                id="committee-bills-title"
                className="text-xl font-bold text-mirai-text"
              >
                この委員会で扱われている案件
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-mirai-text-secondary">
                今年の会期で公開中の案件から、新しい順に表示しています。
              </p>
            </div>
          </div>

          {relatedBills.length > 0 ? (
            <div className="mt-6 flex flex-col gap-4">
              {relatedBills.map((bill) => (
                <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
                  <BillCard bill={bill} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 border-y border-mirai-border py-6">
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                このサイトで公開中の関連案件はまだありません。
              </p>
            </div>
          )}

          <Button
            asChild
            variant="outline"
            className="mt-6 border-mirai-border"
          >
            <Link href={committeeSearchHref as Route}>
              この委員会の案件を議会で探す
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </section>

        <section
          aria-labelledby="committee-official-title"
          className="mt-12 border-t border-mirai-border pt-8"
        >
          <h2
            id="committee-official-title"
            className="text-xl font-bold text-mirai-text"
          >
            公式情報
          </h2>
          <div className="mt-4 flex flex-col items-start gap-2">
            <OfficialLink
              href={COMMITTEE_OFFICIAL_AGENDA_URL}
              label="審査予定案件と過去の開催を見る"
            />
            <OfficialLink
              href={COMMITTEE_OFFICIAL_OVERVIEW_URL}
              label="委員会の役割としくみを見る"
            />
          </div>
        </section>
      </Container>
    </div>
  );
}

function OfficialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-strong hover:underline"
    >
      {label}
      <ExternalLink aria-hidden="true" className="size-4" />
    </a>
  );
}
