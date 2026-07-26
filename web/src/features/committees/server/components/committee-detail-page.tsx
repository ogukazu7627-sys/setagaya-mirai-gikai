import { ArrowLeft, ArrowRight, Landmark } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { routes } from "@/lib/routes";
import { findActivePublicCommitteeById } from "../repositories/committee-directory-repository";

type CommitteeDetailPageProps = {
  committeeId: string;
};

export async function CommitteeDetailPage({
  committeeId,
}: CommitteeDetailPageProps) {
  const committee = await findActivePublicCommitteeById(committeeId);
  if (!committee) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <Container className="py-8 sm:py-12">
        <Link
          href={routes.committees() as Route}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-mirai-text hover:text-primary-accent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          委員会一覧へ
        </Link>

        <section className="mt-4 flex items-center gap-4 rounded-lg border border-mirai-border bg-white p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mirai-gradient text-mirai-text">
            <Landmark aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-accent">
              世田谷区議会
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-relaxed text-mirai-text sm:text-3xl">
              {committee.name}
            </h1>
          </div>
        </section>

        <section aria-labelledby="committee-members-title" className="mt-10">
          <h2
            id="committee-members-title"
            className="text-2xl font-bold text-mirai-text"
          >
            所属議員
          </h2>

          {committee.members.length > 0 ? (
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {committee.members.map((member) => (
                <li key={member.councilorId}>
                  <Link
                    href={routes.councilorDetail(member.councilorId) as Route}
                    className="group flex h-full min-h-24 items-center gap-4 rounded-lg border border-mirai-border bg-white p-4 transition-colors hover:bg-mirai-surface-gray"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white">
                      <Image
                        src={member.iconUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover object-top"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-mirai-text">
                        {member.displayName}
                      </span>
                      {member.role && (
                        <span className="mt-1 block text-xs text-mirai-text-secondary">
                          {member.role}
                        </span>
                      )}
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
            <div className="mt-5 rounded-lg border border-mirai-border bg-white p-6">
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                現在表示できる所属議員はいません。
              </p>
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}
