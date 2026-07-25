import { Writable } from "node:stream";
import type { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "../../../shared/types";
import { BillContent, normalizeSetagayaHeadings } from "./bill-content";

vi.mock(
  "@/features/bill-difficulty/server/loaders/get-difficulty-level",
  () => ({
    getDifficultyLevel: vi.fn().mockResolvedValue("normal"),
  })
);
vi.mock(
  "@/features/bill-difficulty/client/components/difficulty-selector",
  () => ({
    DifficultySelector: () => null,
  })
);

function renderSuspenseToHtml(element: ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
    });

    writable.on("error", reject);
    writable.on("finish", () => resolve(html));

    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(writable);
      },
      onError(error) {
        reject(error);
      },
    });
  });
}

function getSectionAfterHeading(html: string, heading: string): string {
  const headingIndex = html.indexOf(heading);
  expect(headingIndex).toBeGreaterThanOrEqual(0);

  const sectionStart = html.indexOf("<section", headingIndex);
  expect(sectionStart).toBeGreaterThan(headingIndex);

  const sectionEnd = html.indexOf("</section>", sectionStart);
  expect(sectionEnd).toBeGreaterThan(sectionStart);

  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

describe("normalizeSetagayaHeadings", () => {
  it("renames the old divided-opinion heading", () => {
    expect(
      normalizeSetagayaHeadings(`# この案件のポイント

# 意見が分かれるところ

本文です。`)
    ).toContain("# 重要な論点");
  });

  it("keeps the heading level when renaming", () => {
    expect(normalizeSetagayaHeadings(`## 意見が分かれるところ`)).toBe(
      "## 重要な論点"
    );
  });

  it("renames the legacy concern headings", () => {
    expect(normalizeSetagayaHeadings(`# 気になること`)).toBe("# 重要な論点");
    expect(normalizeSetagayaHeadings(`# 考えておきたいこと`)).toBe(
      "# 重要な論点"
    );
  });

  it("renames the legacy councilor opinion heading", () => {
    expect(normalizeSetagayaHeadings(`# 議員の意見`)).toBe(
      "# 議員、会派の意見"
    );
  });

  it("renders the chat-style councilor opinion section with surrounding markdown", async () => {
    const bill = {
      bill_content: {
        content: `# 具体的な内容

本文です。

# 議員、会派の意見

## 中里光夫議員

### 中里光夫議員
質問本文です。

### 市民活動推進課長・伊藤
答弁本文です。

# 議会での結果

結果本文です。`,
      },
    } as unknown as BillWithContent;

    const result = await BillContent({ bill });

    expect(result).not.toBeNull();

    const html = await renderSuspenseToHtml(result as ReactElement);
    expect(html).toContain("data-councilor-opinion-chat");
    expect(html).toContain("わからない言葉を");
    expect(html).toContain("質問本文です。");
    expect(html).toContain("答弁本文です。");
    expect(html).toContain("結果本文です。");
    expect(html).not.toContain('class="councilor-opinion-heading"');
  });

  it.each([
    "normal",
    "hard",
  ])("keeps all FAQ items in one section card for the %s content", async (difficultyLevel) => {
    const bill = {
      bill_content: {
        difficulty_level: difficultyLevel,
        content: `# 具体的な内容

概要本文です。

## 建物と電気設備を改修

具体的な内容の本文です。

# 議員、会派の意見

## 中里光夫議員

### 中里光夫議員
質問本文です。

### 市民活動推進課長・伊藤
答弁本文です。

# よくある質問

## なぜ改修工事を行うのですか？

回答の第一段落です。

回答の第二段落には**重要な説明**があります。

## いつからいつまで休館しますか？

- 休館開始は2026年8月です。
- 再開予定は2027年8月です。

## 断熱改修や太陽光発電も行いますか？

[公式資料](https://www.city.setagaya.lg.jp/)も確認できます。`,
      },
    } as unknown as BillWithContent;

    const result = await BillContent({ bill });
    const html = await renderSuspenseToHtml(result as ReactElement);
    const specificContentCard = getSectionAfterHeading(
      html,
      "<h1>具体的な内容</h1>"
    );
    const faqCard = getSectionAfterHeading(html, "<h1>よくある質問</h1>");

    expect(specificContentCard.match(/<section/g)).toHaveLength(1);
    expect(specificContentCard).toContain("<h2>建物と電気設備を改修</h2>");

    expect(faqCard.match(/<section/g)).toHaveLength(1);
    expect(faqCard.match(/<h2/g)).toHaveLength(3);
    expect(faqCard).toContain("なぜ改修工事を行うのですか？");
    expect(faqCard).toContain("いつからいつまで休館しますか？");
    expect(faqCard).toContain("断熱改修や太陽光発電も行いますか？");
    expect(faqCard).toContain("回答の第一段落です。");
    expect(faqCard).toContain("回答の第二段落には<strong>重要な説明</strong>");
    expect(faqCard).toContain("<ul>");
    expect(faqCard).toContain('<a href="https://www.city.setagaya.lg.jp/"');
  });
});
