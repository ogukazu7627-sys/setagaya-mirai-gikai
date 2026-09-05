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
  })
);

vi.mock(
  "@/features/bills/client/components/question-collection/council-question-navigator",
  () => ({
    CouncilQuestionNavigator: ({
      activeCouncilorId,
      collection,
      items,
      slides,
    }: {
      activeCouncilorId: string;
      collection: { kind: string; sessionKey?: string };
      items: Array<{ councilorId: string; questionCount: number }>;
      slides: Array<{ content: ReactNode; councilorId: string }>;
    }) => (
      <div
        data-active-councilor-id={activeCouncilorId}
        data-collection-session-key={collection.sessionKey}
        data-active-question-count={
          items.find((item) => item.councilorId === activeCouncilorId)
            ?.questionCount
        }
        data-councilor-count={items.length}
        data-rendered-slide-count={slides.length}
      >
        {slides.map((slide) => (
          <div
            data-carousel-slide-councilor={slide.councilorId}
            key={slide.councilorId}
          >
            {slide.content}
          </div>
        ))}
      </div>
    ),
  })
);

describe("GeneralQuestionPage", () => {
  it("選択議員と隣接する議員の質問・答弁をカルーセルへ渡す", async () => {
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
        dietSession: {
          id: "session",
          name: "令和8年第1回定例会",
          slug: "2026-1",
          startDate: "2026-02-01",
        },
        difficultyLevel: "normal",
        focusBillId: focused.id,
        questions: [first, otherCouncilor, focused],
        year: 2026,
      })
    );
    const normalizedHtml = html.replaceAll("<!-- -->", "");

    expect(normalizedHtml).toContain("教育に関する議員の質問");
    expect(normalizedHtml).toContain("令和8年第1回定例会の一般質問");
    expect(normalizedHtml).toContain('data-collection-session-key="2026-1"');
    expect(normalizedHtml).toContain("質問 3件・議員 2人");
    expect(normalizedHtml).toContain('data-active-councilor-id="councilor-a"');
    expect(normalizedHtml).toContain('data-active-question-count="2"');
    expect(normalizedHtml).toContain('data-councilor-count="2"');
    expect(normalizedHtml).toContain('data-chat-kind="general"');
    expect(normalizedHtml).toContain('data-chat-difficulty="normal"');
    expect(normalizedHtml).toContain('data-chat-default-question-id="focused"');
    expect(normalizedHtml).toContain('data-rendered-slide-count="2"');
    expect(normalizedHtml).toContain(
      'data-carousel-slide-councilor="councilor-a"'
    );
    expect(normalizedHtml).toContain(
      'data-carousel-slide-councilor="councilor-b"'
    );
    expect(normalizedHtml).not.toContain("この質問についてAIに聞く");
    expect(normalizedHtml).toContain('data-focused-general-question="true"');
    expect(normalizedHtml).toContain("選択した質問と区の答弁");
    expect(normalizedHtml).toContain("同じ議員の最初の本文");
    expect(normalizedHtml).toContain("別の議員の本文");
    expect(normalizedHtml).toContain(
      'data-councilor-opinion-chat-embedded="true"'
    );
    expect(normalizedHtml).not.toContain("data-councilor-opinion-panel");
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
    content: `# 議員、会派の意見

## ${councilorDisplayName}議員（会派名）

### ${councilorDisplayName}議員
${body}

### 政策経営部長
質問に対する答弁です。`,
  };
  return {
    id,
    name,
    categoryId: "education" as const,
    majorCategory: "教育🏫",
    submittedDate: "2026-02-20",
    publishedAt: "2026-02-21T00:00:00.000Z",
    updatedAt: "2026-02-22T00:00:00.000Z",
    dietSession: {
      id: "session",
      name: "令和8年第1回定例会",
      slug: "2026-1",
      startDate: "2026-02-01",
    },
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
