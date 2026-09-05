import "server-only";

import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CouncilQuestionAiChatProvider } from "@/features/bills/client/components/question-collection/council-question-ai-chat";
import { CouncilQuestionNavigator } from "@/features/bills/client/components/question-collection/council-question-navigator";
import { CouncilQuestionMarkdown } from "@/features/bills/server/components/question-collection/council-question-markdown";
import { getCouncilQuestionCarouselWindow } from "@/features/bills/shared/utils/council-question-carousel";
import {
  groupCouncilQuestionsByCouncilor,
  prioritizeFocusedCouncilQuestion,
} from "@/features/bills/shared/utils/council-question-groups";
import { buildCouncilQuestionOverview } from "@/features/bills/shared/utils/council-question-overview";
import { getCalendarYearFromDate } from "@/features/diet-sessions/shared/utils/calendar-year";
import { routes } from "@/lib/routes";
import { formatDateWithDots, getJapanTime } from "@/lib/utils/date";
import { getGeneralQuestionSessionKey } from "../../shared/utils/general-question-categories";
import type { loadGeneralQuestionCategoryPage } from "../loaders/load-general-question-category-page";

type GeneralQuestionCategoryPageData = NonNullable<
  Awaited<ReturnType<typeof loadGeneralQuestionCategoryPage>>
>;
type GeneralQuestion = GeneralQuestionCategoryPageData["questions"][number];

type GeneralQuestionPageProps = GeneralQuestionCategoryPageData & {
  difficultyLevel: DifficultyLevelEnum;
  focusBillId?: string | null;
};

function getQuestionMetaText(question: GeneralQuestion): string | null {
  const displayDate = question.submittedDate ?? question.publishedAt;
  const sessionName = question.dietSession?.name;

  if (displayDate) {
    return `${formatDateWithDots(displayDate)}${sessionName ? `＠${sessionName}` : ""}`;
  }

  return sessionName ?? null;
}

function GeneralQuestionCouncilorSlide({
  focusBillId,
  questions,
}: {
  focusBillId?: string | null;
  questions: GeneralQuestion[];
}) {
  return (
    <div className="space-y-12" data-general-councilor-questions>
      {questions.map((question, index) => {
        const metaText = getQuestionMetaText(question);

        return (
          <article
            className="scroll-mt-28"
            data-focused-general-question={
              question.id === focusBillId ? "true" : undefined
            }
            id={`general-question-${question.id}`}
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
                {question.selectedContent.title || question.name}
              </h2>
              <p className="mt-4 rounded-md bg-primary-light px-4 py-3 leading-7 text-mirai-text">
                {buildCouncilQuestionOverview({
                  councilorDisplayName: question.councilor.displayName,
                  partyOrGroup: question.partyOrGroup,
                  questionName: question.name,
                })}
              </p>
            </header>

            <div className="mt-6">
              <CouncilQuestionMarkdown
                content={question.selectedContent.content}
                presentation="embedded"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function GeneralQuestionPage({
  category,
  dietSession,
  difficultyLevel,
  focusBillId,
  questions,
  year,
}: GeneralQuestionPageProps) {
  const currentYear = getCalendarYearFromDate(getJapanTime());
  const returnHref =
    year === currentYear
      ? `${routes.bills()}#theme-bills`
      : `${routes.bills()}?archive_year=${year}#archive-theme-bills`;
  const focusedQuestion =
    questions.find((question) => question.id === focusBillId) ?? questions[0];
  const councilorGroups = groupCouncilQuestionsByCouncilor(questions);
  const activeCouncilorGroup = focusedQuestion
    ? councilorGroups.find(
        (group) => group.councilor.id === focusedQuestion.councilor.id
      )
    : null;
  const activeQuestions = activeCouncilorGroup
    ? prioritizeFocusedCouncilQuestion(
        activeCouncilorGroup.questions,
        focusBillId
      )
    : [];
  const carouselGroups = activeCouncilorGroup
    ? getCouncilQuestionCarouselWindow(
        councilorGroups,
        activeCouncilorGroup.councilor.id
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
          <Link href={returnHref as Route}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            議会へ戻る
          </Link>
        </Button>

        <header className="mt-5 border-mirai-border border-b pb-6">
          <p className="flex items-center gap-2 text-sm font-bold text-primary-strong">
            <MessageCircleQuestion aria-hidden="true" className="size-4" />
            {dietSession.name}の一般質問
          </p>
          <h1 className="mt-2 text-2xl font-bold text-mirai-text sm:text-3xl">
            {category.name}に関する議員の質問
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mirai-text-secondary">
            世田谷区議会の本会議で行われた一般質問を、議員ごとにまとめています。質問と、それに対する区の答弁を確認できます。
          </p>
          {questions.length > 0 ? (
            <p className="mt-4 text-xs font-bold text-mirai-text-secondary">
              質問 {questions.length}件・議員 {councilorGroups.length}人
            </p>
          ) : null}
        </header>

        {!activeCouncilorGroup ? (
          <div className="mt-8 rounded-md border border-mirai-border bg-white px-6 py-12 text-center">
            <p className="font-bold text-mirai-text">
              この分野で公開中の一般質問はまだありません
            </p>
            <p className="mt-2 text-sm text-mirai-text-secondary">
              新しい質問が公開されると、ここに表示されます。
            </p>
          </div>
        ) : (
          <CouncilQuestionAiChatProvider
            defaultQuestion={{
              id: activeQuestions[0].id,
              name: activeQuestions[0].name,
            }}
            difficultyLevel={difficultyLevel}
            kind="general"
          >
            <CouncilQuestionNavigator
              activeCouncilorId={activeCouncilorGroup.councilor.id}
              collection={{
                kind: "general",
                categoryId: category.id,
                year,
                sessionKey: getGeneralQuestionSessionKey(dietSession),
              }}
              items={councilorGroups.map((group) => ({
                councilorId: group.councilor.id,
                councilorDisplayName: group.councilor.displayName,
                councilorIconUrl: group.councilor.iconUrl,
                firstQuestionId: group.questions[0].id,
                questionCount: group.questions.length,
              }))}
              slides={carouselGroups.map((group) => {
                const isActiveGroup =
                  group.councilor.id === activeCouncilorGroup.councilor.id;

                return {
                  content: (
                    <GeneralQuestionCouncilorSlide
                      focusBillId={isActiveGroup ? focusBillId : null}
                      questions={
                        isActiveGroup ? activeQuestions : group.questions
                      }
                    />
                  ),
                  councilorId: group.councilor.id,
                };
              })}
            />
          </CouncilQuestionAiChatProvider>
        )}
      </div>
    </div>
  );
}
