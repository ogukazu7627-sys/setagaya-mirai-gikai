import {
  ArrowRight,
  MessageSquareText,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { routes } from "@/lib/routes";
import { loadCouncilorDirectory } from "../loaders/load-councilor-directory";

export async function CouncilorDirectoryPage() {
  const councilors = await loadCouncilorDirectory();
  const totalStatementCount = councilors.reduce(
    (total, councilor) => total + councilor.statementCount,
    0
  );
  const activeStatementCouncilorCount = councilors.filter(
    (councilor) => councilor.statementCount > 0
  ).length;

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <div className="border-b border-mirai-border pb-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-accent bg-mirai-light-gradient px-3 py-1 text-sm font-bold text-primary-strong">
                <Sparkles aria-hidden="true" className="size-4" />
                区議会で話す人
              </p>
              <h1 className="text-3xl font-bold tracking-normal text-mirai-text sm:text-4xl">
                議員
              </h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-mirai-text-secondary">
                世田谷区議会の議員と、このサイトに掲載している発言を確認できます。
              </p>
            </div>

            <dl className="flex flex-wrap gap-2">
              <div className="inline-flex items-baseline gap-2 rounded-full border border-mirai-border bg-white px-4 py-2 shadow-sm">
                <dt className="text-xs font-bold text-mirai-text-secondary">
                  掲載議員
                </dt>
                <dd className="text-lg font-bold text-mirai-text">
                  {councilors.length}
                  <span className="ml-1 text-sm text-mirai-text-secondary">
                    人
                  </span>
                </dd>
              </div>
              <div className="inline-flex items-baseline gap-2 rounded-full border border-mirai-border bg-white px-4 py-2 shadow-sm">
                <dt className="text-xs font-bold text-mirai-text-secondary">
                  発言がある議員
                </dt>
                <dd className="text-lg font-bold text-mirai-text">
                  {activeStatementCouncilorCount}
                  <span className="ml-1 text-sm text-mirai-text-secondary">
                    人
                  </span>
                </dd>
              </div>
              <div className="inline-flex items-baseline gap-2 rounded-full border border-mirai-border bg-white px-4 py-2 shadow-sm">
                <dt className="text-xs font-bold text-mirai-text-secondary">
                  掲載中の発言
                </dt>
                <dd className="text-lg font-bold text-mirai-text">
                  {totalStatementCount}
                  <span className="ml-1 text-sm text-mirai-text-secondary">
                    件
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {councilors.length > 0 ? (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {councilors.map((councilor) => (
              <li key={councilor.id}>
                <Link
                  href={routes.councilorDetail(councilor.id) as Route}
                  className="group flex h-full min-h-28 items-center gap-4 rounded-lg border border-mirai-border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-accent hover:shadow-md"
                >
                  <span className="relative size-20 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-mirai-gradient p-1">
                    <span className="relative block size-full overflow-hidden rounded-full bg-white">
                      <Image
                        src={councilor.iconUrl}
                        alt=""
                        width={72}
                        height={72}
                        className="size-full object-cover object-top"
                      />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold text-mirai-text">
                      {councilor.displayName}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-mirai-border bg-mirai-surface-gray px-3 py-1 text-xs font-bold text-mirai-text-secondary">
                      <MessageSquareText
                        aria-hidden="true"
                        className="size-3.5 text-primary-accent"
                      />
                      {councilor.statementCount > 0
                        ? `発言 ${councilor.statementCount}件`
                        : "発言はまだありません"}
                    </span>
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-mirai-border bg-white text-primary-accent transition-colors group-hover:border-primary-accent group-hover:bg-mirai-light-gradient">
                    <ArrowRight aria-hidden="true" className="size-5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <section className="mt-8 rounded-lg border border-mirai-border bg-white p-6 text-center shadow-sm">
            <UsersRound
              aria-hidden="true"
              className="mx-auto size-8 text-primary-accent"
            />
            <h2 className="mt-3 text-lg font-bold text-mirai-text">
              表示できる議員情報がありません
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mirai-text-secondary">
              議員マスタの公開準備が整うと、ここに表示されます。
            </p>
          </section>
        )}
      </Container>
    </div>
  );
}
