import "server-only";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import {
  type RecommendedCouncilor,
  RecommendedCouncilorCard,
} from "./recommended-councilor-card";

type RecommendedCouncilorsSectionProps = {
  councilors: RecommendedCouncilor[];
};

export function RecommendedCouncilorsSection({
  councilors,
}: RecommendedCouncilorsSectionProps) {
  if (councilors.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="recommended-councilors-heading"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h2
            id="recommended-councilors-heading"
            className="text-[22px] font-bold leading-[1.48] text-mirai-text"
          >
            おすすめの議員
          </h2>
          <p className="mt-1.5 text-xs font-medium leading-[1.67] text-mirai-text-secondary">
            日付をもとに紹介する議員を入れ替えています。掲載順は支持や評価を示すものではありません。
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href={routes.councilors() as Route}>
            議員一覧を見る
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 pc:grid-cols-3">
        {councilors.map((councilor) => (
          <RecommendedCouncilorCard key={councilor.id} councilor={councilor} />
        ))}
      </ul>
    </section>
  );
}
