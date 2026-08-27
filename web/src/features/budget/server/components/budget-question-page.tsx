import "server-only";

import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CouncilQuestionMarkdown } from "@/features/bills/server/components/question-collection/council-question-markdown";
import {
  BudgetQuestionAiAskButton,
  BudgetQuestionAiChatProvider,
} from "@/features/budget/client/components/budget-question-ai-chat";
import { BudgetQuestionNavigator } from "@/features/budget/client/components/budget-question-navigator";
import {
  groupBudgetQuestionsByCouncilor,
  prioritizeFocusedBudgetQuestion,
} from "@/features/budget/shared/utils/budget-question-groups";
import { buildBudgetQuestionOverview } from "@/features/budget/shared/utils/budget-question-overview";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { loadBudgetQuestionCategoryPage } from "../loaders/load-budget-questions";

type BudgetQuestionCategoryPageData = NonNullable<
  Awaited<ReturnType<typeof loadBudgetQuestionCategoryPage>>
>;

type BudgetQuestionPageProps = BudgetQuestionCategoryPageData & {
  difficultyLevel: DifficultyLevelEnum;
  focusBillId?: string | null;
};

function getBudgetQuestionMetaText(
  question: BudgetQuestionCategoryPageData["questions"][number]
): string | null {
  const displayDate = question.submittedDate ?? question.publishedAt;
  const sessionName = question.dietSession?.name;

  if (displayDate) {
    return `${formatDateWithDots(displayDate)} 提出${sessionName ? `＠${sessionName}` : ""}`;
  }

  return sessionName ?? null;
}

export { CouncilQuestionMarkdown as BudgetQuestionMarkdown };

export function BudgetQuestionPage({
  category,
  difficultyLevel,
  focusBillId,
  questions,
}: BudgetQuestionPageProps) {
  const returnHref =
    category.slug === "all"
      ? routes.budget()
      : routes.budgetCategory(category.slug);
  const focusedQuestion =
    questions.find((question) => question.id === focusBillId) ?? questions[0];
  const councilorGroups = groupBudgetQuestionsByCouncilor(questions);
  const activeCouncilorGroup = focusedQuestion
    ? councilorGroups.find(
        (group) => group.councilor.id === focusedQuestion.councilor.id
      )
    : null;
  const activeQuestions = activeCouncilorGroup
    ? prioritizeFocusedBudgetQuestion(
        activeCouncilorGroup.questions,
        focusBillId
      )
    : [];

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="min-h-11 rounded-md px-2 text-mirai-text-secondary"
        >
          <Link href={returnHref}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            触れる予算へ戻る
          </Link>
        </Button>

        <header className="mt-5 border-mirai-border border-b pb-6">
          <p className="flex items-center gap-2 text-sm font-bold text-primary-strong">
            <MessageCircleQuestion aria-hidden="true" className="size-4" />
            議員の質問
          </p>
          <h1 className="mt-2 text-2xl font-bold text-mirai-text sm:text-3xl">
            {category.name}に関する議員の発言
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mirai-text-secondary">
            世田谷区議会で予算について行われた質問をまとめています。質問は、区の予算配分や執行そのものを示すものではありません。
          </p>
        </header>

        {!activeCouncilorGroup ? (
          <div className="mt-8 rounded-md border border-mirai-border bg-white px-6 py-12 text-center">
            <p className="font-bold text-mirai-text">
              この分野で公開中の議員質問はまだありません
            </p>
            <p className="mt-2 text-sm text-mirai-text-secondary">
              新しい質問が公開されると、ここに表示されます。
            </p>
          </div>
        ) : (
          <BudgetQuestionAiChatProvider difficultyLevel={difficultyLevel}>
            <BudgetQuestionNavigator
              activeCouncilorId={activeCouncilorGroup.councilor.id}
              categorySlug={category.slug}
              items={councilorGroups.map((group) => ({
                councilorId: group.councilor.id,
                councilorDisplayName: group.councilor.displayName,
                councilorIconUrl: group.councilor.iconUrl,
                firstQuestionId: group.questions[0].id,
                questionCount: group.questions.length,
              }))}
            />

            <div className="mt-8 space-y-12" data-budget-councilor-questions>
              {activeQuestions.map((question, index) => {
                const metaText = getBudgetQuestionMetaText(question);

                return (
                  <article
                    className="scroll-mt-28"
                    data-focused-budget-question={
                      question.id === focusBillId ? "true" : undefined
                    }
                    id={`budget-question-${question.id}`}
                    key={question.id}
                  >
                    <header className="border-mirai-border border-b pb-6">
                      {index > 0 ? (
                        <p className="mb-3 text-xs font-bold text-primary-strong">
                          同じ議員の別の質問
                        </p>
                      ) : null}
                      {metaText ? (
                        <p className="text-xs font-bold text-mirai-text-secondary">
                          {metaText}
                        </p>
                      ) : null}
                      <h2 className="mt-2 text-xl font-bold leading-8 text-mirai-text sm:text-2xl">
                        {question.name}
                      </h2>
                      <p
                        className="mt-4 rounded-md bg-primary-light px-4 py-3 leading-7 text-mirai-text"
                        data-budget-question-overview
                      >
                        {buildBudgetQuestionOverview({
                          councilorDisplayName: question.councilor.displayName,
                          partyOrGroup: question.partyOrGroup,
                          questionName: question.name,
                        })}
                      </p>
                      <div className="mt-4 flex justify-end">
                        <BudgetQuestionAiAskButton
                          questionId={question.id}
                          questionName={question.name}
                        />
                      </div>
                    </header>

                    <div className="mt-6">
                      <CouncilQuestionMarkdown
                        content={question.selectedContent.content}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </BudgetQuestionAiChatProvider>
        )}
      </div>
    </div>
  );
}
