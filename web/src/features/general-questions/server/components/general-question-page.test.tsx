import { Writable } from "node:stream";
import type { ReactElement, ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getGeneralQuestionCategoryById } from "../../shared/utils/general-question-categories";
import { GeneralQuestionPage } from "./general-question-page";

vi.mock(
  "@/features/bills/client/components/question-collection/council-question-ai-chat",
  () => ({
    CouncilQuestionAiChatProvider: ({
      children,
      defaultQuestion,
      difficultyLevel,
      kind,
    }: {
      children: ReactNode;
      defaultQuestion?: { id: string };
      difficultyLevel: string;
      kind: string;
    }) => (
      <div
        data-chat-default-question-id={defaultQuestion?.id}
        data-chat-difficulty={difficultyLevel}
        data-chat-kind={kind}
      >
        {children}
      </div>
    ),
    CouncilQuestionAiAskButton: ({ questionId }: { questionId: string }) => (
      <div data-ai-question-id={questionId} />
    ),
  })
);

vi.mock(
  "@/features/bills/client/components/question-collection/council-question-navigator",
  () => ({
    CouncilQuestionNavigator: ({
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

describe("GeneralQuestionPage", () => {
  it("予算質問と同じ形式で選択議員の質問・答弁だけを縦に並べる", async () => {
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
      "選択した質問と区の答弁",
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
    const category = getGeneralQuestionCategoryById("education");
    if (!category) {
      throw new Error("教育カテゴリが見つかりません");
    }

    const html = await renderToHtml(
      GeneralQuestionPage({
        category,
        difficultyLevel: "normal",
        focusBillId: focused.id,
        questions: [first, otherCouncilor, focused],
        year: 2026,
      })
    );
    const normalizedHtml = html.replaceAll("<!-- -->", "");

    expect(normalizedHtml).toContain("教育に関する議員の質問");
    expect(normalizedHtml).toContain("質問 3件・議員 2人");
    expect(normalizedHtml).toContain('data-active-councilor-id="councilor-a"');
    expect(normalizedHtml).toContain('data-active-question-count="2"');
    expect(normalizedHtml).toContain('data-councilor-count="2"');
    expect(normalizedHtml).toContain('data-chat-kind="general"');
    expect(normalizedHtml).toContain('data-chat-difficulty="normal"');
    expect(normalizedHtml).toContain('data-chat-default-question-id="focused"');
    expect(normalizedHtml).toContain('data-ai-question-id="focused"');
    expect(normalizedHtml).toContain('data-ai-question-id="first"');
    expect(normalizedHtml).not.toContain('data-ai-question-id="other"');
    expect(normalizedHtml).toContain('data-focused-general-question="true"');
    expect(normalizedHtml).toContain("選択した質問と区の答弁");
    expect(normalizedHtml).toContain("同じ議員の最初の本文");
    expect(normalizedHtml).not.toContain("別の議員の本文");
    expect(normalizedHtml.indexOf("選択した質問と区の答弁")).toBeLessThan(
      normalizedHtml.indexOf("同じ議員の最初の本文")
    );
    expect(normalizedHtml).toContain(
      "会派名の意見として、甲議員が「学校施設の改修」について質問しました。"
    );
  });
});

function createQuestion(
  id: string,
  name: string,
  body: string,
  councilorId: string,
  councilorDisplayName: string
) {
  const selectedContent = {
    difficultyLevel: "normal" as const,
    title: name,
    summary: `${name}の概要`,
    content: `# 概要\n\n${body}`,
  };
  return {
    id,
    name,
    categoryId: "education" as const,
    majorCategory: "教育🏫",
    submittedDate: "2026-02-20",
    publishedAt: "2026-02-21T00:00:00.000Z",
    updatedAt: "2026-02-22T00:00:00.000Z",
    dietSession: { id: "session", name: "第1回定例会", slug: null },
    partyOrGroup: "会派名",
    councilor: {
      id: councilorId,
      displayName: councilorDisplayName,
      iconUrl: null,
    },
    contents: { normal: selectedContent },
    selectedContent,
  };
}

function renderToHtml(element: ReactElement): Promise<string> {
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
