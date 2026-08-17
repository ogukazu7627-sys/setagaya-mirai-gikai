import "server-only";

import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { CouncilorAvatarImage } from "@/components/councilor-avatar-image";
import { Button } from "@/components/ui/button";
import { normalizeSetagayaHeadings } from "@/features/bills/server/components/bill-detail/bill-content";
import {
  parseMarkdown,
  resolveMarkdownSectionHeadingTag,
} from "@/lib/markdown";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { formatDateWithDots } from "@/lib/utils/date";
import type { loadBudgetQuestionCategoryPage } from "../loaders/load-budget-questions";

type BudgetQuestionCategoryPageData = NonNullable<
  Awaited<ReturnType<typeof loadBudgetQuestionCategoryPage>>
>;

type BudgetQuestionPageProps = BudgetQuestionCategoryPageData & {
  focusBillId?: string | null;
};

async function BudgetQuestionMarkdown({ content }: { content: string }) {
  const normalizedMarkdown = normalizeSetagayaHeadings(content);
  const sectionHeadingTag =
    resolveMarkdownSectionHeadingTag(normalizedMarkdown);
  const renderedContent = await parseMarkdown(normalizedMarkdown, {
    sectionHeadingTag,
  });

  return (
    <div className="markdown-content max-w-none text-base [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-70 [&_blockquote]:border-gray-300 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-3 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-4 [&_section>*:last-child]:mb-0 [&_section]:mb-6 [&_section]:rounded-md [&_section]:bg-mirai-surface-grouped [&_section]:p-5 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
      {renderedContent}
    </div>
  );
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

        {questions.length === 0 ? (
          <div className="mt-8 rounded-md border border-mirai-border bg-white px-6 py-12 text-center">
            <p className="font-bold text-mirai-text">
              この分野で公開中の議員質問はまだありません
            </p>
            <p className="mt-2 text-sm text-mirai-text-secondary">
              新しい質問が公開されると、ここに表示されます。
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {questions.map((question) => {
              const isFocused = question.id === focusBillId;
              const displayDate =
                question.submittedDate ?? question.publishedAt;
              const sessionName = question.dietSession?.name;
              const metaText = displayDate
                ? `${formatDateWithDots(displayDate)} 提出${sessionName ? `＠${sessionName}` : ""}`
                : sessionName;

              return (
                <article
                  id={`budget-question-${question.id}`}
                  key={question.id}
                  className={cn(
                    "scroll-mt-28 rounded-md border bg-white p-5 sm:p-7",
                    isFocused
                      ? "border-primary-strong ring-2 ring-primary/30"
                      : "border-mirai-border"
                  )}
                >
                  {isFocused ? (
                    <p className="mb-4 inline-flex rounded-md bg-primary-light px-3 py-1 text-xs font-bold text-primary-strong">
                      選択した質問
                    </p>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <CouncilorAvatarImage
                      alt={`${question.councilor.displayName}議員`}
                      className="size-14 shrink-0 rounded-full object-cover"
                      size={56}
                      src={question.councilor.iconUrl}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-mirai-text">
                        {question.councilor.displayName}議員
                      </p>
                      {metaText ? (
                        <p className="mt-1 text-xs text-mirai-text-secondary">
                          {metaText}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <h2 className="mt-5 text-xl font-bold leading-8 text-mirai-text sm:text-2xl">
                    {question.name}
                  </h2>
                  {question.selectedContent.summary ? (
                    <p className="mt-3 leading-7 text-mirai-text-secondary">
                      {question.selectedContent.summary}
                    </p>
                  ) : null}

                  <div className="mt-6 border-mirai-border border-t pt-6">
                    <BudgetQuestionMarkdown
                      content={question.selectedContent.content}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
