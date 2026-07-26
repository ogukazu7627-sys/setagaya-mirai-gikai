import { ArrowRight, ChevronRight, ExternalLink, Landmark } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import {
  COMMITTEE_KIND_LABELS,
  COMMITTEE_OFFICIAL_OVERVIEW_URL,
  type CommitteeKind,
  getCommitteeProfile,
} from "@/features/committees/shared/committee-profiles";
import { routes } from "@/lib/routes";
import { findActivePublicCommittees } from "../repositories/committee-directory-repository";

const COMMITTEE_GROUPS: Array<{
  kind: CommitteeKind;
  description: string;
}> = [
  {
    kind: "standing",
    description: "区政の分野ごとに、継続して議案などを審査します。",
  },
  {
    kind: "operations",
    description: "本会議の日程や進め方など、議会運営を協議します。",
  },
  {
    kind: "special",
    description: "複数分野にまたがる特定の課題を集中的に調査します。",
  },
];

export async function CommitteeDirectoryPage() {
  const committees = await findActivePublicCommittees();

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <nav
          aria-label="パンくず"
          className="flex min-h-11 items-center gap-1 text-sm font-bold"
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
          <span aria-current="page" className="text-mirai-text">
            委員会
          </span>
        </nav>

        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-primary-accent">議会の中で</p>
          <h1 className="text-3xl font-bold text-mirai-text">委員会</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-mirai-text-secondary">
            議案や請願・陳情を分野ごとに詳しく審査し、区政の課題を調査する場です。
          </p>
        </div>

        {committees.length > 0 ? (
          <div className="mt-10 flex flex-col gap-12">
            {COMMITTEE_GROUPS.map((group) => {
              const groupedCommittees = committees.filter(
                (committee) =>
                  getCommitteeProfile(committee.name).kind === group.kind
              );
              if (groupedCommittees.length === 0) {
                return null;
              }

              return (
                <section
                  key={group.kind}
                  aria-labelledby={`committee-group-${group.kind}`}
                >
                  <h2
                    id={`committee-group-${group.kind}`}
                    className="text-xl font-bold text-mirai-text"
                  >
                    {COMMITTEE_KIND_LABELS[group.kind]}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-mirai-text-secondary">
                    {group.description}
                  </p>
                  <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {groupedCommittees.map((committee) => {
                      const profile = getCommitteeProfile(committee.name);
                      return (
                        <li key={committee.id}>
                          <Link
                            href={routes.committeeDetail(committee.id) as Route}
                            className="group flex h-full min-h-44 flex-col rounded-lg border border-mirai-border bg-white p-5 transition-colors hover:bg-mirai-surface-gray"
                          >
                            <span className="flex items-start gap-3">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mirai-gradient text-mirai-text">
                                <Landmark
                                  aria-hidden="true"
                                  className="size-5"
                                />
                              </span>
                              <span className="min-w-0 flex-1 font-bold leading-relaxed text-mirai-text group-hover:text-primary-strong">
                                {committee.name}
                              </span>
                            </span>
                            <span className="mt-4 block text-sm leading-relaxed text-mirai-text-secondary">
                              {profile.summary}
                            </span>
                            <span className="mt-auto flex items-center justify-end gap-1 pt-4 text-sm font-bold text-primary-accent">
                              役割と案件を見る
                              <ArrowRight
                                aria-hidden="true"
                                className="size-4"
                              />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            <a
              href={COMMITTEE_OFFICIAL_OVERVIEW_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-primary-strong hover:underline"
            >
              世田谷区議会の公式説明を確認する
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </div>
        ) : (
          <section className="mt-8 border-y border-mirai-border py-8 text-center">
            <Landmark
              aria-hidden="true"
              className="mx-auto size-8 text-primary-accent"
            />
            <h2 className="mt-3 text-lg font-bold text-mirai-text">
              表示できる委員会情報がありません
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mirai-text-secondary">
              委員会情報の公開準備が整うと、ここに表示されます。
            </p>
          </section>
        )}
      </Container>
    </div>
  );
}
