import {
  Building2,
  ExternalLink,
  Landmark,
  MessageSquareText,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CouncilorProfileCatalogEntry } from "../../shared/councilor-profile-types";
import {
  COUNCILOR_OFFICIAL_ROSTER_SOURCES,
  COUNCILOR_OFFICIAL_ROSTER_AS_OF,
} from "../../shared/councilor-profile-catalog";
import type { PublicCouncilor } from "../repositories/councilor-directory-repository";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";

type CouncilorProfileSectionProps = {
  councilor: PublicCouncilor;
  profile: CouncilorProfileCatalogEntry | null;
  publishedQuestionCount: number;
};

function OfficialSourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-bold text-primary-strong underline decoration-primary-accent/40 underline-offset-4 hover:decoration-primary-accent"
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-3" />
    </a>
  );
}

export function CouncilorProfileSection({
  councilor,
  profile,
  publishedQuestionCount,
}: CouncilorProfileSectionProps) {
  const officialAsOf = formatDate(COUNCILOR_OFFICIAL_ROSTER_AS_OF);
  const hasSummary = Boolean(
    profile?.summary &&
      profile.questionCount !== null &&
      profile.summaryAsOf !== null
  );
  const showQuestionProfile = hasSummary || publishedQuestionCount === 0;

  return (
    <div className="px-5 py-6 sm:px-7 sm:py-7">
      <h2 className="text-lg font-bold text-mirai-text">この議員について</h2>

      <dl className="mt-5 grid min-w-0 border-y border-mirai-border sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)]">
        <div className="min-w-0 py-5 sm:pr-6">
          <dt className="flex items-center gap-2 text-xs font-bold text-mirai-text-muted">
            <Landmark
              aria-hidden="true"
              className="size-4 text-primary-accent"
            />
            会派等
          </dt>
          <dd className="mt-2 break-words text-base font-bold leading-relaxed text-mirai-text">
            {profile?.factionName ?? "所属情報を確認中です"}
          </dd>
          <p className="mt-2 text-xs leading-relaxed text-mirai-text-muted">
            {officialAsOf}現在・{` `}
            <OfficialSourceLink
              href={COUNCILOR_OFFICIAL_ROSTER_SOURCES.factions}
            >
              世田谷区公式名簿
            </OfficialSourceLink>
          </p>
        </div>

        <div className="min-w-0 border-t border-mirai-border py-5 sm:border-t-0 sm:border-l sm:pl-6">
          <dt className="flex items-center gap-2 text-xs font-bold text-mirai-text-muted">
            <Building2
              aria-hidden="true"
              className="size-4 text-primary-accent"
            />
            所属委員会
          </dt>
          <dd className="mt-2">
            {councilor.committees.length > 0 ? (
              <ul className="space-y-1.5">
                {councilor.committees.map((committee) => (
                  <li key={committee.id} className="min-w-0">
                    <Link
                      href={routes.committeeDetail(committee.id) as Route}
                      className="inline break-words font-bold leading-relaxed text-mirai-text underline decoration-primary-accent/35 underline-offset-4 hover:text-primary-strong hover:decoration-primary-accent"
                    >
                      {committee.name}
                      {committee.role ? `（${committee.role}）` : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                所属情報を確認中です。
              </p>
            )}
          </dd>
          <p className="mt-2 text-xs leading-relaxed text-mirai-text-muted">
            {officialAsOf}現在・{` `}
            <OfficialSourceLink
              href={COUNCILOR_OFFICIAL_ROSTER_SOURCES.committees}
            >
              世田谷区公式名簿
            </OfficialSourceLink>
          </p>
        </div>
      </dl>

      {showQuestionProfile && (
        <div className="pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-mirai-text">
            <MessageSquareText
              aria-hidden="true"
              className="size-4 text-primary-accent"
            />
            掲載中の質問から
          </h3>

          {hasSummary && profile ? (
            <>
              {profile.themes.length > 0 && (
                <ul
                  aria-label="主なテーマ"
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {profile.themes.map((theme) => (
                    <li
                      key={theme}
                      className="rounded-full border border-primary-accent/35 bg-primary-accent/5 px-3 py-1 text-xs font-bold text-primary-strong"
                    >
                      {theme}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-mirai-text-secondary">
                {profile.summary}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-mirai-text-muted">
                このサイトで公開中の質問{profile.questionCount}件をもとに整理（
                {formatDate(profile.summaryAsOf ?? "")}現在）
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-mirai-text-secondary">
              このサイトに掲載している質問はまだありません。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
