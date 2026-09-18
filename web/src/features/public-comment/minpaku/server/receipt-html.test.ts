import { describe, expect, it } from "vitest";
import { createPublicCommentReceiptHtml } from "./receipt-html";

describe("createPublicCommentReceiptHtml", () => {
  it("renders the brand, final comment, conversation, and official link", () => {
    const html = createPublicCommentReceiptHtml({
      subject: "民泊パブリックコメント：インタビューと最終案の控え",
      body: "案内\nhttps://www.city.setagaya.lg.jp/pub-comment/02245/34014.html",
      finalBody: "騒音への対応を求めます。",
      conversation: [
        { role: "assistant", content: "どの点が気になりますか？" },
        { role: "user", content: "夜間の騒音です。" },
      ],
    });

    expect(html).toContain("みらい議会＠世田谷");
    expect(html).toContain("確認済みコメント");
    expect(html).toContain("騒音への対応を求めます。");
    expect(html).toContain("AIインタビュアー");
    expect(html).toContain("公式提出ページを開く");
    expect(html).toContain(
      "https://www.city.setagaya.lg.jp/pub-comment/02245/34014.html"
    );
  });

  it("escapes persisted user content before placing it in HTML", () => {
    const html = createPublicCommentReceiptHtml({
      subject: '<script>alert("subject")</script>',
      body: "案内",
      finalBody: '<img src=x onerror="alert(1)"> & 本文',
      conversation: [{ role: "user", content: "<b>回答</b>" }],
    });

    expect(html).toContain(
      "&lt;script&gt;alert(&quot;subject&quot;)&lt;/script&gt;"
    );
    expect(html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; 本文"
    );
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<b>回答</b>");
  });
});
