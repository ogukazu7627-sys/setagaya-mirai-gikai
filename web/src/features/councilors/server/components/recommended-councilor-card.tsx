import "server-only";

import { ArrowRight, MessageSquareText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import { routes } from "@/lib/routes";

export type RecommendedCouncilor = {
  id: string;
  displayName: string;
  iconUrl: string;
  statementCount: number;
};

type RecommendedCouncilorCardProps = {
  councilor: RecommendedCouncilor;
};

export function RecommendedCouncilorCard({
  councilor,
}: RecommendedCouncilorCardProps) {
  return (
    <li>
      <Link
        href={routes.councilorDetail(councilor.id) as Route}
        className="group flex h-full flex-col overflow-hidden rounded-md border border-mirai-border bg-white transition-colors hover:bg-mirai-surface-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2"
      >
        <div className="flex flex-1 items-center gap-4 p-4">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-full border border-mirai-border bg-white pc:size-18">
            <CouncilorAvatarImage
              src={councilor.iconUrl}
              alt=""
              size={72}
              className="size-full object-cover object-top"
            />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold leading-relaxed text-mirai-text">
              {councilor.displayName}
            </h3>
            <span className="mt-1.5 flex items-center gap-1.5 text-xs leading-relaxed text-mirai-text-secondary">
              <MessageSquareText
                aria-hidden="true"
                className="size-4 shrink-0 text-primary-accent"
              />
              {councilor.statementCount > 0
                ? `掲載中の発言 ${councilor.statementCount}件`
                : "掲載中の発言はまだありません"}
            </span>
          </div>
        </div>
        <span className="flex items-center justify-between gap-3 border-t border-mirai-border px-4 py-3 text-sm font-bold text-primary-strong">
          プロフィールと発言を見る
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </li>
  );
}
