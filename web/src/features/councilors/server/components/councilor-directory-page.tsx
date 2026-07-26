import { ArrowRight, UsersRound } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { routes } from "@/lib/routes";
import { loadCouncilorDirectory } from "../loaders/load-councilor-directory";

export async function CouncilorDirectoryPage() {
  const councilors = await loadCouncilorDirectory();

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-primary-accent">
            区議会で話す人
          </p>
          <h1 className="text-3xl font-bold text-mirai-text">議員</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-mirai-text-secondary">
            世田谷区議会の議員と、このサイトに掲載している案件での発言を確認できます。
          </p>
        </div>

        {councilors.length > 0 ? (
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {councilors.map((councilor) => (
              <li key={councilor.id}>
                <Link
                  href={routes.councilorDetail(councilor.id) as Route}
                  className="group flex min-h-24 h-full items-center gap-4 rounded-lg border border-mirai-border bg-white p-4 transition-colors hover:bg-mirai-surface-gray"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white">
                    <Image
                      src={councilor.iconUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover object-top"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-mirai-text">
                      {councilor.displayName}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-mirai-text-secondary">
                      {councilor.statementCount > 0
                        ? `掲載中の発言 ${councilor.statementCount}件`
                        : "掲載中の発言はまだありません"}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-primary-accent"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <section className="mt-8 rounded-lg border border-mirai-border bg-white p-6 text-center">
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
