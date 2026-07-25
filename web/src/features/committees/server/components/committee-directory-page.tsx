import { ArrowLeft, ArrowRight, Landmark } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { routes } from "@/lib/routes";
import { findActivePublicCommittees } from "../repositories/committee-directory-repository";

export async function CommitteeDirectoryPage() {
  const committees = await findActivePublicCommittees();

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <Link
          href={routes.bills() as Route}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-mirai-text hover:text-primary-accent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          議会へ
        </Link>

        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-primary-accent">
            議案を詳しく調べる場
          </p>
          <h1 className="text-3xl font-bold text-mirai-text">委員会</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-mirai-text-secondary">
            世田谷区議会の委員会と、委員会に所属する議員を確認できます。
          </p>
        </div>

        {committees.length > 0 ? (
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {committees.map((committee) => (
              <li key={committee.id}>
                <Link
                  href={routes.committeeDetail(committee.id) as Route}
                  className="group flex h-full min-h-24 items-center gap-4 rounded-lg border border-mirai-border bg-white p-4 transition-colors hover:bg-mirai-surface-gray"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mirai-gradient text-mirai-text">
                    <Landmark aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-relaxed text-mirai-text">
                      {committee.name}
                    </span>
                    <span className="mt-1 block text-xs text-mirai-text-secondary">
                      所属議員 {committee.memberCount}人
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
            <Landmark
              aria-hidden="true"
              className="mx-auto size-8 text-primary-accent"
            />
            <h2 className="mt-3 text-lg font-bold text-mirai-text">
              表示できる委員会情報がありません
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mirai-text-secondary">
              委員会マスタの公開準備が整うと、ここに表示されます。
            </p>
          </section>
        )}
      </Container>
    </div>
  );
}
