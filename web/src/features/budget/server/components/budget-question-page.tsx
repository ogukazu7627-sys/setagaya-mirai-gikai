import "server-only";

import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CouncilorOpinionChatSection } from "@/features/bills/client/components/bill-detail/councilor-opinion-chat-section";
import { normalizeSetagayaHeadings } from "@/features/bills/server/components/bill-detail/bill-content";
import { BudgetQuestionNavigator } from "@/features/budget/client/components/budget-question-navigator";
import { buildBudgetQuestionOverview } from "@/features/budget/shared/utils/budget-question-overview";
import {
  parseMarkdown,
  resolveMarkdownSectionHeadingTag,
} from "@/lib/markdown";
import { splitMarkdownByCouncilorOpinionChatSection } from "@/lib/markdown/extract-councilor-opinion-chat-section";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { loadBudgetQuestionCategoryPage } from "../loaders/load-budget-questions";

type BudgetQuestionCategoryPageData = NonNullable<
  Awaited<ReturnType<typeof loadBudgetQuestionCategoryPage>>
>;

type BudgetQuestionPageProps = BudgetQuestionCategoryPageData & {
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

const MARKDOWN_CLASS_NAME =
  "markdown-content max-w-none text-base [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-70 [&_blockquote]:border-gray-300 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-3 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-4 [&_section>*:last-child]:mb-0 [&_section]:mb-6 [&_section]:rounded-md [&_section]:bg-mirai-surface-grouped [&_section]:p-5 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6";

export async function BudgetQuestionMarkdown({ content }: { content: string }) {
  const normalizedMarkdown = normalizeSetagayaHeadings(content);
  const sectionHeadingTag =
    resolveMarkdownSectionHeadingTag(normalizedMarkdown);
  const chatSplit =
    splitMarkdownByCouncilorOpinionChatSection(normalizedMarkdown);

  if (chatSplit) {
    const [beforeContent, afterContent] = await Promise.all([
      chatSplit.beforeMarkdown
        ? parseMarkdown(chatSplit.beforeMarkdown, { sectionHeadingTag })
        : null,
      chatSplit.afterMarkdown
        ? parseMarkdown(chatSplit.afterMarkdown, { sectionHeadingTag })
        : null,
    ]);

    return (
      <div className="space-y-6">
        {beforeContent ? (
          <div className={MARKDOWN_CLASS_NAME}>{beforeContent}</div>
        ) : null}
        <CouncilorOpinionChatSection
          scrollSingleGroup
          section={chatSplit.chatSection}
        />
        {afterContent ? (
          <div className={MARKDOWN_CLASS_NAME}>{afterContent}</div>
        ) : null}
      </div>
    );
  }

  const renderedContent = await parseMarkdown(normalizedMarkdown, {
    sectionHeadingTag,
  });

  return <div className={MARKDOWN_CLASS_NAME}>{renderedContent}</div>;
}

export function BudgetQuestionPage({
  category,
  focusBillId,
  questions,
}: BudgetQuestionPageProps) {
  const returnHref =
    category.slug === "all"
      ? routes.budget()
      : routes.budgetCategory(category.slug);
  const activeQuestion =
    questions.find((question) => question.id === focusBillId) ?? questions[0];
  const activeQuestionMetaText = activeQuestion
    ? getBudgetQuestionMetaText(activeQuestion)
    : null;

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

        {!activeQuestion ? (
          <div className="mt-8 rounded-md border border-mirai-border bg-white px-6 py-12 text-center">
            <p className="font-bold text-mirai-text">
              この分野で公開中の議員質問はまだありません
            </p>
            <p className="mt-2 text-sm text-mirai-text-secondary">
              新しい質問が公開されると、ここに表示されます。
            </p>
          </div>
        ) : (
          <>
            <BudgetQuestionNavigator
              activeQuestionId={activeQuestion.id}
              categorySlug={category.slug}
              items={questions.map((question) => ({
                id: question.id,
                councilorDisplayName: question.councilor.displayName,
                councilorIconUrl: question.councilor.iconUrl,
                questionName: question.name,
              }))}
            />

            <article
              className="mt-8 scroll-mt-28"
              id={`budget-question-${activeQuestion.id}`}
            >
              <header className="border-mirai-border border-b pb-6">
                {activeQuestionMetaText ? (
                  <p className="text-xs font-bold text-mirai-text-secondary">
                    {activeQuestionMetaText}
                  </p>
                ) : null}
                <h2 className="mt-2 text-xl font-bold leading-8 text-mirai-text sm:text-2xl">
                  {activeQuestion.name}
                </h2>
                <p
                  className="mt-4 rounded-md bg-primary-light px-4 py-3 leading-7 text-mirai-text"
                  data-budget-question-overview
                >
                  {buildBudgetQuestionOverview({
                    councilorDisplayName: activeQuestion.councilor.displayName,
                    partyOrGroup: activeQuestion.partyOrGroup,
                    questionName: activeQuestion.name,
                  })}
                </p>
              </header>

              <div className="mt-6">
                <BudgetQuestionMarkdown
                  content={activeQuestion.selectedContent.content}
                />
              </div>
            </article>
          </>
        )}
      </div>
    </div>
  );
}
