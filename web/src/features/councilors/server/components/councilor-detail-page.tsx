import { ArrowLeft, ArrowRight, MessageSquareText } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
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

        <section className="mt-4 flex items-center gap-5 rounded-lg border border-mirai-border bg-white p-5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white sm:size-24">
            <Image
              src={detail.councilor.iconUrl}
              alt=""
              width={96}
              height={96}
              priority
              className="size-full object-cover object-top"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-accent">
              世田谷区議会議員
            </p>
            <h1 className="mt-1 text-2xl font-bold text-mirai-text sm:text-3xl">
              {detail.councilor.displayName}
            </h1>
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
              掲載案件での発言
            </h2>
          </div>

          {detail.statements.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-4">
              {detail.statements.map((statement) => {
                const bill = statement.bills;
                if (!bill) {
                  return null;
                }

                return (
                  <li key={statement.id}>
                    <Link
                      href={routes.billDetail(bill.id) as Route}
                      className="group block rounded-lg border border-mirai-border bg-white p-5 transition-colors hover:bg-mirai-surface-gray"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold leading-relaxed text-mirai-text">
                            {bill.name}
                          </h3>
                          {bill.submitted_date && (
                            <time className="mt-1 block text-xs text-mirai-text-muted">
                              {formatDateWithDots(bill.submitted_date)}
                            </time>
                          )}
                        </div>
                        <ArrowRight
                          aria-hidden="true"
                          className="mt-1 size-5 shrink-0 text-primary-accent"
                        />
                      </div>
                      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-mirai-text-secondary">
                        {statement.content_text}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-5 rounded-lg border border-mirai-border bg-white p-6">
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                このサイトに掲載している公開案件では、同期済みの発言がまだありません。
              </p>
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}
