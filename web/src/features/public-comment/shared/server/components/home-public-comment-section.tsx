import "server-only";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { HomePublicCommentCarousel } from "@/features/public-comment/shared/client/home-public-comment-carousel";
import { PUBLIC_COMMENT_CAMPAIGNS } from "@/features/public-comment/shared/public-comment-campaigns";
import { routes } from "@/lib/routes";

export function HomePublicCommentSection() {
  return (
    <section
      aria-labelledby="home-public-comment-heading"
      className="bg-mirai-surface py-10 md:py-12"
    >
      <Container>
        <div className="flex flex-col gap-6">
          <div className="flex items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h2
                id="home-public-comment-heading"
                className="text-[22px] font-bold leading-[1.48] text-mirai-text"
              >
                AIパブコメインタビュー
              </h2>
              <p className="mt-1.5 text-sm font-medium leading-[1.8] text-mirai-text-secondary">
                AIの質問に答えながら考えを整理し、世田谷区へ提出する意見の下書きをつくれます。提出はご自身で公式フォームから行います。
              </p>
              <Link
                href={routes.publicComments() as Route}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-strong underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              >
                10件をすべて見る
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <Image
              src="/illustrations/interview-illustration.png"
              width={580}
              height={745}
              alt=""
              sizes="112px"
              className="hidden h-32 w-auto shrink-0 object-contain object-bottom md:block"
            />
          </div>

          <HomePublicCommentCarousel campaigns={PUBLIC_COMMENT_CAMPAIGNS} />
        </div>
      </Container>
    </section>
  );
}
