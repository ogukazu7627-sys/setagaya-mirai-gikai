import { parseMarkdown } from "@/lib/markdown";
import type { BillWithContent } from "../../../shared/types";

interface BillContentProps {
  bill: BillWithContent;
}

const HEADING_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^(#{1,6})\s+この(?:法律|議案)のポイント\s*$/gm, "$1 この案件のポイント"],
  [
    /^(#{1,6})\s+この(?:法律|議案)が必要な理由\s*$/gm,
    "$1 この案件が出てきた背景",
  ],
  [
    /^(#{1,6})\s+影響を受ける(?:可能性がある)?人(?:・団体)?\s*$/gm,
    "$1 関係する人・地域",
  ],
  [/^(#{1,6})\s+意見が分かれるところ\s*$/gm, "$1 考えておきたいこと"],
  [/^(#{1,6})\s+議員の意見\s*$/gm, "$1 議員、会派の意見"],
  [/^(#{1,6})\s+チームみらいの賛否\s*$/gm, "$1 議会での結果"],
];

export function normalizeSetagayaHeadings(markdown: string): string {
  return HEADING_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    markdown
  );
}

export async function BillContent({ bill }: BillContentProps) {
  const markdownContent = bill.bill_content?.content;

  if (!markdownContent) {
    return null;
  }

  const content = await parseMarkdown(
    normalizeSetagayaHeadings(markdownContent)
  );

  return (
    <div
      className="
            markdown-content max-w-none text-base
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4
            [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:mb-4
            [&_h2.councilor-opinion-heading]:flex [&_h2.councilor-opinion-heading]:items-center
            [&_h2.councilor-opinion-heading]:gap-3 [&_h2.councilor-opinion-heading]:break-normal
            [&_.councilor-opinion-icon]:h-10 [&_.councilor-opinion-icon]:w-8
            [&_.councilor-opinion-icon]:shrink-0 [&_.councilor-opinion-icon]:rounded-md
            [&_.councilor-opinion-icon]:object-cover [&_.councilor-opinion-icon]:align-middle
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
            [&_p]:mb-4 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_li]:mb-4
            [&_a]:!underline [&_a]:!underline-offset-[3px]
            [&_a:hover]:opacity-70
            [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300
            [&_blockquote]:pl-4
            [&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto
            [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded
            [&_section]:bg-white [&_section]:px-4 [&_section]:py-8 [&_section]:rounded-md [&_section]:mb-9
            [&_section]:break-all
            [&_section>*:last-child]:mb-0
            [&_section:has(>iframe)]:p-0
            [&_iframe.youtube-embed]:w-full [&_iframe.youtube-embed]:aspect-video [&_iframe.youtube-embed]:mb-4
            [&_iframe.youtube-embed]:rounded-lg [&_iframe.youtube-embed]:shadow-md
          "
    >
      {content}
    </div>
  );
}
