import { Writable } from "node:stream";
import type { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BillWithContent } from "../../../shared/types";
import { BillContent, normalizeSetagayaHeadings } from "./bill-content";

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

describe("normalizeSetagayaHeadings", () => {
  it("renames the old divided-opinion heading", () => {
    expect(
      normalizeSetagayaHeadings(`# この案件のポイント

# 意見が分かれるところ

本文です。`)
    ).toContain("# 考えておきたいこと");
  });

  it("keeps the heading level when renaming", () => {
    expect(normalizeSetagayaHeadings(`## 意見が分かれるところ`)).toBe(
      "## 考えておきたいこと"
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
});
