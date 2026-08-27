import "server-only";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MessageSquareText,
  Quote,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import { Container } from "@/components/layouts/container";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import { buildCouncilorStatementLink } from "../../shared/utils/build-councilor-statement-link";
import { loadCouncilorDetail } from "../loaders/load-councilor-directory";

type CouncilorDetailPageProps = {
  councilorId: string;
};

export async function CouncilorDetailPage({
  councilorId,
}: CouncilorDetailPageProps) {
  const detail = await loadCouncilorDetail(councilorId);
  if (!detail) {
    notFound();
  }
  const statementCount = detail.statements.length;

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <Link
          href={routes.councilors() as Route}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-mirai-text hover:text-primary-accent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          議員一覧へ
        </Link>

        <section className="mt-4 overflow-hidden rounded-lg border border-mirai-border bg-white shadow-sm">
          <div className="bg-mirai-light-gradient px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white p-1 sm:size-28">
                <CouncilorAvatarImage
                  src={detail.councilor.iconUrl}
                  alt=""
                  size={112}
                  priority
                  className="size-full rounded-full object-cover object-top"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-primary-strong">
                  世田谷区議会議員
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-normal text-mirai-text sm:text-4xl">
                  {detail.councilor.displayName}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-mirai-border bg-white px-3 py-1 text-xs font-bold text-mirai-text-secondary">
                    <MessageSquareText
                      aria-hidden="true"
                      className="size-4 text-primary-accent"
                    />
                    掲載中の発言 {statementCount}件
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 sm:px-7">
            <p className="text-sm leading-relaxed text-mirai-text-secondary">
              掲載案件での発言と、予算特別委員会での質問をまとめています。それぞれの該当箇所へ直接たどれます。
            </p>
          </div>
        </section>

        <section aria-labelledby="councilor-statements-title" className="mt-10">
          <div className="flex items-center gap-3">
            <MessageSquareText
              aria-hidden="true"
              className="size-6 text-primary-accent"
            />
            <h2
              id="councilor-statements-title"
              className="text-2xl font-bold text-mirai-text"
            >
              掲載中の発言
            </h2>
          </div>

          {statementCount > 0 ? (
            <ul className="mt-5 flex flex-col gap-4">
              {detail.statements.map((statement) => {
                const bill = statement.bills;
                if (!bill) {
                  return null;
                }

                const cardContent = (
                  <>
                    <div className="flex items-start gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-mirai-border bg-mirai-light-gradient text-primary-strong">
                        <Quote aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="font-bold leading-relaxed text-mirai-text">
                              {bill.name}
                            </h3>
                            {bill.submitted_date && (
                              <time className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-mirai-text-muted">
                                <CalendarDays
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {formatDateWithDots(bill.submitted_date)}
                              </time>
                            )}
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary-accent bg-white px-3 py-1 text-xs font-bold text-primary-strong">
                            {bill.publication_category === "budget"
                              ? "予算の質問へ"
                              : bill.publication_category === "general_question"
                                ? "一般質問へ"
                                : "該当箇所へ"}
                            <ArrowRight
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </span>
                        </div>
                        <div className="mt-5 rounded-md bg-mirai-surface-gray px-3 py-4">
                          <div className="flex items-start gap-2">
                            <span className="relative mt-0.5 size-9 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white">
                              <CouncilorAvatarImage
                                src={detail.councilor.iconUrl}
                                alt=""
                                size={36}
                                className="size-full object-cover object-top"
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 max-w-full truncate text-xs font-bold text-mirai-text-secondary">
                                {statement.raw_heading}
                              </div>
                              <div className="whitespace-pre-line rounded-md border border-mirai-border bg-white px-4 py-3 text-sm font-medium leading-7 text-mirai-text">
                                {statement.previewText}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );

                return (
                  <li key={statement.id}>
                    <Link
                      href={
                        buildCouncilorStatementLink({
                          billId: bill.id,
                          publicationCategory: bill.publication_category,
                          majorCategory: bill.major_category,
                          sessionStartDate: bill.diet_session?.start_date,
                          statementIndex: statement.statement_index,
                        }).href as Route
                      }
                      className="group block rounded-lg border border-mirai-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-accent hover:shadow-md"
                    >
                      {cardContent}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-5 rounded-lg border border-mirai-border bg-white p-6">
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                このサイトに掲載している発言はまだありません。
              </p>
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}
