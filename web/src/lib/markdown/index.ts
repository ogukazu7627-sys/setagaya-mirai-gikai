import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ReactElement } from "react";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import rehypeSanitize, {
  defaultSchema,
  type Options as RehypeSanitizeOptions,
} from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { LongPressSection } from "@/features/bills/client/components/bill-detail/long-press-section";
import { DifficultyInfoCard } from "@/features/bills/server/components/bill-detail/difficulty-info-card";
import { COUNCILOR_OPINION_SECTION_TITLE } from "./councilor-opinion-section";
import { rehypeCouncilorOpinionIcons } from "./rehype-councilor-opinion-icons";
import { rehypeEmbedYouTube } from "./rehype-embed-youtube";
import { rehypeExternalLinks } from "./rehype-external-links";
import { rehypeInjectElement } from "./rehype-inject-element";
import {
  type MarkdownSectionHeadingTag,
  rehypeWrapSections,
} from "./rehype-wrap-sections";

const h2AttributesWithoutClassName = (
  defaultSchema.attributes?.h2 || []
).filter(
  (attribute) =>
    (Array.isArray(attribute) ? attribute[0] : attribute) !== "className"
);
const councilorOpinionHeadingClassAttribute: [string, ...string[]] = [
  "className",
  "sr-only",
  "councilor-opinion-heading",
];

// rehypeSanitizeのスキーマをカスタマイズ
const sanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), "target", "rel"],
    h2: [
      ...h2AttributesWithoutClassName,
      councilorOpinionHeadingClassAttribute,
    ],
    img: [
      ...(defaultSchema.attributes?.img || []),
      "alt",
      "className",
      "decoding",
      "height",
      "loading",
      "src",
      "width",
    ],
    span: [...(defaultSchema.attributes?.span || []), "className"],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "img",
    "span",
    // カスタム要素を許可
    "LongPressSection",
    "DifficultyInfoCard",
  ],
};

/**
 * 元のMarkdown文書全体から、白いセクションカードの境界を決める。
 * H1が複数ある記事はH1を章、従来形式の記事はH2を章として扱う。
 */
export function resolveMarkdownSectionHeadingTag(
  markdown: string
): MarkdownSectionHeadingTag {
  const tree = unified().use(remarkParse).parse(markdown);
  const h1Count = tree.children.filter(
    (node) => node.type === "heading" && node.depth === 1
  ).length;
  return h1Count > 1 ? "h1" : "h2";
}

export interface ParseMarkdownOptions {
  sectionHeadingTag?: MarkdownSectionHeadingTag;
}

/**
 * MarkdownテキストをReact Elementに変換
 * @param markdown - Markdown形式のテキスト
 * @param options - 元文書のセクション境界などの描画オプション
 * @returns React Element（部分水和対応）
 */
export async function parseMarkdown(
  markdown: string,
  options: ParseMarkdownOptions = {}
): Promise<ReactElement> {
  // Markdown → mdast（remarkBreaksでソフト改行をbreak nodeに変換）
  const remarkProcessor = unified().use(remarkParse).use(remarkBreaks);
  const parsed = remarkProcessor.parse(markdown);
  const mdast = (await remarkProcessor.run(parsed)) as typeof parsed;

  // mdast → hast（rehypeプラグイン適用）
  const hast = await unified()
    .use(remarkRehype)
    .use(rehypeWrapSections, {
      sectionHeadingTag: options.sectionHeadingTag,
    })
    .use(rehypeInjectElement, {
      injections: [
        {
          targetHeadingText: COUNCILOR_OPINION_SECTION_TITLE,
          tagName: "LongPressSection",
        },
        {
          targetHeadingText: "よくある質問",
          tagName: "DifficultyInfoCard",
        },
      ],
    })
    .use(rehypeCouncilorOpinionIcons)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeExternalLinks)
    .use(rehypeEmbedYouTube)
    .run(mdast);

  // hast → React Element（部分水和）
  return toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    components: {
      LongPressSection, // Client Componentとして水和
      DifficultyInfoCard, // Client Componentとして水和
    },
  });
}
