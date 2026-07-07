import { existsSync } from "node:fs";
import { join } from "node:path";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import {
  COUNCILOR_ICON_URLS,
  getCouncilorIconUrl,
} from "./councilor-icon-config";
import { rehypeCouncilorOpinionIcons } from "./rehype-councilor-opinion-icons";
import { rehypeWrapSections } from "./rehype-wrap-sections";

async function renderMarkdown(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeWrapSections)
    .use(rehypeCouncilorOpinionIcons, {
      defaultIconUrl: "/icons/default-councilor.svg",
      iconUrlByName: {
        福田たえ美: "/icons/councilors/fukuda-taemi.png",
      },
    })
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

describe("rehypeCouncilorOpinionIcons", () => {
  it("adds icons to h2 headings inside the councilor opinion section", async () => {
    const html = await renderMarkdown(`# 主な論点

## 費用をどう見るか

本文。

# 議員の意見

## 福田たえ美議員（公明党世田谷区議団）

発言内容。

## 山田太郎議員

発言内容。

# よくある質問

## Q. これは議案ですか？

A. いいえ。`);

    expect(html).toContain('class="councilor-opinion-heading"');
    expect(html).toContain('class="councilor-opinion-icon"');
    expect(html).toContain('src="/icons/councilors/fukuda-taemi.png"');
    expect(html).toContain('src="/icons/default-councilor.svg"');
    expect(html).toContain(
      '<span class="councilor-opinion-name">福田たえ美議員（公明党世田谷区議団）</span>'
    );
    expect(html).toContain(
      '<span class="councilor-opinion-name">山田太郎議員</span>'
    );
  });

  it("does not add icons to h2 headings in other sections", async () => {
    const html = await renderMarkdown(`# 主な論点

## 費用をどう見るか

本文。

# よくある質問

## Q. これは議案ですか？

A. いいえ。`);

    expect(html).not.toContain("councilor-opinion-heading");
    expect(html).not.toContain("councilor-opinion-icon");
  });

  it("uses the default Setagaya councilor icon map when no custom map is passed", async () => {
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeWrapSections)
        .use(rehypeCouncilorOpinionIcons)
        .use(rehypeStringify)
        .process(`# 議員の意見

## 福田たえ美議員

発言内容。`)
    );

    expect(html).toContain('src="/icons/councilors/fukuda-taemi.jpg"');
  });

  it("has icon files for all configured Setagaya councilors", () => {
    expect(Object.keys(COUNCILOR_ICON_URLS)).toHaveLength(50);

    for (const iconUrl of Object.values(COUNCILOR_ICON_URLS)) {
      expect(existsSync(join(process.cwd(), "public", iconUrl))).toBe(true);
    }
  });

  it("matches councilor headings with suffixes, parties, spaces, and unicode variants", () => {
    expect(getCouncilorIconUrl("福田 たえ美議員（公明党世田谷区議団）")).toBe(
      "/icons/councilors/fukuda-taemi.jpg"
    );
    expect(getCouncilorIconUrl("石原せいじ議員")).toBe(
      "/icons/councilors/ishihara-seiji.jpg"
    );
  });
});
