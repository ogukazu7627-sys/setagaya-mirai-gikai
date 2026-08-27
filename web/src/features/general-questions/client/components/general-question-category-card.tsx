import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import type { GeneralQuestionCategoryCardData } from "../../shared/types/general-question";

type GeneralQuestionCategoryCardProps = {
  category: GeneralQuestionCategoryCardData;
};

export function GeneralQuestionCategoryCard({
  category,
}: GeneralQuestionCategoryCardProps) {
  return (
    <Link
      href={
        routes.generalQuestionCategory(
          category.year,
          category.categoryId,
          category.focusBillId ?? undefined
        ) as Route
      }
      className="group block max-w-[634px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
    >
      <Card className="overflow-hidden border border-black bg-white shadow-none transition-colors group-hover:bg-muted/50">
        <CardHeader className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mirai-gradient text-primary-strong">
              <MessageCircleQuestion aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary-strong">
                {category.year}年の一般質問
              </p>
              <CardTitle className="mt-2 text-xl leading-8 tracking-normal sm:text-2xl">
                {category.name}に関する議員の質問
              </CardTitle>
              <p className="mt-3 text-sm leading-7 text-mirai-text-secondary">
                {category.description}
                について、議員ごとに質問と区の答弁を確認できます。
              </p>
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-mirai-border pt-4">
                <span className="text-sm font-bold text-mirai-text">
                  質問 {category.questionCount}件
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-primary-strong">
                  質問を見る
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
