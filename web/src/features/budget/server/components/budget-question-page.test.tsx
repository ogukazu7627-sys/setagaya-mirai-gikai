import { Writable } from "node:stream";
import type { ReactElement, ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  BudgetQuestionMarkdown,
  BudgetQuestionPage,
} from "./budget-question-page";

vi.mock("@/features/budget/client/components/budget-question-ai-chat", () => ({
  BudgetQuestionAiChatProvider: ({
    children,
    difficultyLevel,
  }: {
    children: ReactNode;
    difficultyLevel: string;
  }) => <div data-chat-difficulty={difficultyLevel}>{children}</div>,
  BudgetQuestionAiAskButton: ({ questionId }: { questionId: string }) => (
    <div data-ai-question-id={questionId} />
  ),
}));

vi.mock(
  "@/features/budget/client/components/budget-question-navigator",
  () => ({
    BudgetQuestionNavigator: ({
      activeCouncilorId,
      items,
    }: {
      activeCouncilorId: string;
      items: Array<{ councilorId: string; questionCount: number }>;
    }) => (
      <div
        data-active-councilor-id={activeCouncilorId}
        data-active-question-count={
          items.find((item) => item.councilorId === activeCouncilorId)
            ?.questionCount
        }
        data-councilor-count={items.length}
      />
    ),
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

describe("BudgetQuestionMarkdown", () => {
  it("議員と区側の発言を既存の吹き出しUIで表示する", async () => {
    const element = await BudgetQuestionMarkdown({
      content: `# 議員、会派の意見

## くろだあいこ議員（会派名）

### くろだあいこ議員
予算の増加要因を質問しました。

### 財政課長
当初予算の内容を答弁しました。`,
    });
    const html = await renderSuspenseToHtml(element as ReactElement);

    expect(html).toContain("data-councilor-opinion-chat");
    expect(html).toContain("data-councilor-chat-bubble");
    expect(html).toContain("予算の増加要因を質問しました。");
    expect(html).toContain("当初予算の内容を答弁しました。");
    expect(html).toContain('data-councilor-chat-scroll-region="true"');
    expect(html).not.toContain("<h2>くろだあいこ議員");
  });

  it("質疑構造がない本文は通常のMarkdownとして表示する", async () => {
    const element = await BudgetQuestionMarkdown({
      content: "# 概要\n\n予算に関する説明です。",
    });
    const html = await renderSuspenseToHtml(element as ReactElement);

    expect(html).toContain("予算に関する説明です。");
    expect(html).not.toContain("data-councilor-opinion-chat");
  });
});

describe("BudgetQuestionPage", () => {
  it("選択した議員の質問を縦に並べる", async () => {
    const createQuestion = (
      id: string,
      name: string,
      body: string,
      councilorId: string,
      councilorDisplayName: string
    ) => ({
      id,
      name,
      categorySlug: "education" as const,
      majorCategory: "教育🏫",
      submittedDate: "2026-08-01",
      publishedAt: "2026-08-02T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
      dietSession: { id: "session", name: "予算特別委員会", slug: null },
      partyOrGroup: "会派名",
      councilor: {
        id: councilorId,
        displayName: councilorDisplayName,
        iconUrl: "/icons/councilor-default.svg",
      },
      contents: {
        normal: {
          difficultyLevel: "normal" as const,
          title: name,
          summary: `旧概要-${id}`,
          content: `# 概要\n\n${body}`,
        },
      },
      selectedContent: {
        difficultyLevel: "normal" as const,
        title: name,
        summary: `旧概要-${id}`,
        content: `# 概要\n\n${body}`,
      },
    });
    const first = createQuestion(
      "first",
      "同じ議員の最初の質問",
      "同じ議員の最初の本文",
      "councilor-a",
      "甲"
    );
    const focused = createQuestion(
      "focused",
      "学校施設の改修について",
      "選択した本文",
      "councilor-a",
      "甲"
    );
    const otherCouncilor = createQuestion(
      "other",
      "別の議員の質問",
      "別の議員の本文",
      "councilor-b",
      "乙"
    );

    const element = BudgetQuestionPage({
      category: {
        slug: "education",
        name: "教育",
        majorCategory: "教育🏫",
      },
      difficultyLevel: "normal",
      focusBillId: focused.id,
      questions: [first, otherCouncilor, focused],
    });
    const html = await renderSuspenseToHtml(element);

    expect(html).toContain('data-active-councilor-id="councilor-a"');
    expect(html).toContain('data-active-question-count="2"');
    expect(html).toContain('data-councilor-count="2"');
    expect(html).toContain('data-chat-difficulty="normal"');
    expect(html).toContain('data-ai-question-id="focused"');
    expect(html).toContain('data-ai-question-id="first"');
    expect(html).not.toContain('data-ai-question-id="other"');
    expect(html).toContain("選択した本文");
    expect(html).toContain("同じ議員の最初の本文");
    expect(html).not.toContain("別の議員の本文");
    expect(html.indexOf("選択した本文")).toBeLessThan(
      html.indexOf("同じ議員の最初の本文")
    );
    expect(html).toContain(
      "会派名の意見として、甲議員が「学校施設の改修」について質問しました。"
    );
    expect(html).not.toContain("旧概要-focused");
  });
});
