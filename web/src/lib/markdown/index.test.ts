import { Writable } from "node:stream";
import type { ReactElement } from "react";
import { renderToPipeableStream, renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./index";

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

describe("parseMarkdown", () => {
  it("should not allow malicious iframe elements", async () => {
    const markdown = `<iframe src="https://malicious.com/evil" onload="alert('XSS')"></iframe>

https://www.youtube.com/watch?v=safe123`;

    const result = await parseMarkdown(markdown);
    const html = renderToStaticMarkup(result);

    // 悪意のあるiframeは削除され、YouTube埋め込みだけが残ることを確認
    expect(html).not.toContain("malicious.com");
    expect(html).not.toContain("onload");
    expect(html).toContain('src="https://www.youtube.com/embed/safe123"');
  });

  it("should keep councilor icon markup after sanitizing markdown", async () => {
    const markdown = `# 主な論点

## 費用をどう見るか

本文。

# 議員、会派の意見

## 福田たえ美議員

発言内容。`;

    const result = await parseMarkdown(markdown);
    const html = await renderSuspenseToHtml(result);

    expect(html).toContain("councilor-opinion-heading");
    expect(html).toContain("councilor-opinion-icon");
    expect(html).toContain("/icons/councilors/fukuda-taemi.jpg");
    expect(html.match(/councilor-opinion-icon/g)).toHaveLength(1);
  });
});
