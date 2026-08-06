import "server-only";

import { ArrowLeft, BookOpen, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { isBudgetMapSampleQuestionId } from "../../shared/utils/budget-map-sample-questions";

/**
 * 議員の質問の詳細ページ。
 *
 * 予算マップの質問衛星から `questionId` だけを受け取って遷移する。
 * 質問本文の表示は予算特別委員会の質問データが入ってから実装する。
 */
export function BudgetQuestionPage({ questionId }: { questionId: string }) {
  const isSample = isBudgetMapSampleQuestionId(questionId);

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="min-h-11 rounded-md px-2 text-mirai-text-secondary"
        >
          <Link href={routes.budget()}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            触れる予算へ戻る
          </Link>
        </Button>

        <div className="mt-6 rounded-md border border-mirai-border bg-white p-6 sm:p-8">
          <p className="flex items-center gap-2 text-sm font-bold text-primary-strong">
            <MessageCircleQuestion aria-hidden="true" className="size-4" />
            議員の質問
          </p>
          <h1 className="mt-3 text-2xl font-bold text-mirai-text sm:text-3xl">
            この質問の詳細は準備中です
          </h1>
          <p className="mt-4 text-sm leading-7 text-mirai-text-secondary">
            {isSample
              ? "これは質問衛星の動作確認用に置いた見本です。実際に議会で行われた質問ではありません。"
              : "質問の本文と会議録へのリンクは、予算特別委員会の質問データを整理してから公開します。"}
          </p>
          <p className="mt-4 text-sm leading-7 text-mirai-text-secondary">
            議員の質問は、区が当初予算をどう配分したかを説明するものではありません。議会で行われた質問であり、予算の配分や執行そのものを示しません。
          </p>
          <dl className="mt-6 rounded-md bg-mirai-surface-grouped p-4 text-sm">
            <dt className="font-bold text-mirai-text">質問ID</dt>
            <dd className="mt-1 break-all font-mono text-mirai-text-secondary">
              {questionId}
            </dd>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 rounded-md"
            >
              <Link href={routes.budget()}>触れる予算をひらく</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 rounded-md"
            >
              <Link href={routes.budgetOfficialHierarchy()}>
                <BookOpen aria-hidden="true" className="size-4" />
                公式予算分類から探す
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
