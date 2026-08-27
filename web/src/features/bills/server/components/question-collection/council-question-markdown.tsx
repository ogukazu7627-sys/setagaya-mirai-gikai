import { CouncilorOpinionChatSection } from "@/features/bills/client/components/bill-detail/councilor-opinion-chat-section";
import { normalizeSetagayaHeadings } from "@/features/bills/server/components/bill-detail/bill-content";
import {
  parseMarkdown,
  resolveMarkdownSectionHeadingTag,
} from "@/lib/markdown";
import { splitMarkdownByCouncilorOpinionChatSection } from "@/lib/markdown/extract-councilor-opinion-chat-section";

const MARKDOWN_CLASS_NAME =
  "markdown-content max-w-none text-base [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-70 [&_blockquote]:border-gray-300 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-3 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-4 [&_section>*:last-child]:mb-0 [&_section]:mb-6 [&_section]:rounded-md [&_section]:bg-mirai-surface-grouped [&_section]:p-5 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6";

export async function CouncilQuestionMarkdown({
  content,
}: {
  content: string;
}) {
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
