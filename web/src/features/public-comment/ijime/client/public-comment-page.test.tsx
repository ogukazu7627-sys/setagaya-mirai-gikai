// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCommentIjimePage } from "./public-comment-page";

const auth = vi.hoisted(() => ({
  status: "authenticated",
  userEmail: "user@example.com",
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/chat/client/hooks/use-chat-auth", () => ({
  useChatAuth: () => auth,
}));

vi.mock(
  "@/features/public-comment/shared/client/ensure-public-comment-actor",
  () => ({
    ensurePublicCommentActor: vi.fn().mockResolvedValue({
      id: "anonymous-user",
      is_anonymous: true,
    }),
  })
);

vi.mock(
  "@/features/public-comment/shared/client/public-comment-interview-chat",
  () => ({
    PublicCommentInterviewChat: ({
      messages,
      isComplete,
      onContinueToDraft,
    }: {
      messages: Array<{ id: string; content: string }>;
      isComplete: boolean;
      onContinueToDraft: () => void;
    }) => (
      <div data-testid="mock-interview">
        {messages.map((message) => (
          <p key={message.id}>{message.content}</p>
        ))}
        {isComplete && (
          <button type="button" onClick={onContinueToDraft}>
            下書き作成へ進む
          </button>
        )}
      </div>
    ),
  })
);

describe("PublicCommentIjimePage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/ijime");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("相談窓口との違い、個人情報、安全導線を開始前に示す", () => {
    render(<PublicCommentIjimePage />);
    expect(
      screen.getByRole("img", {
        name: "子どもたちが安心して話せる学びの場を描いたイラスト",
      })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("ijime-public-comment-hero.webp")
    );
    expect(
      screen.getByText(/個別のいじめを相談・通報する窓口ではありません/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/個人名、学校名、学年・クラス/)
    ).toBeInTheDocument();
    expect(screen.getByText(/0120-810-293/)).toBeInTheDocument();
    expect(screen.getByText(/2026年10月8日/)).toBeInTheDocument();
  });

  it("控えメールを初期選択し、同意後に専用APIで開始する", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: "session-1",
          messages: [
            {
              id: "question-1",
              role: "assistant",
              content: "関わり方を教えてください",
              question_id: "relationship",
            },
          ],
          quickReplies: ["子ども本人として"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentIjimePage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));

    await waitFor(() =>
      expect(screen.getByTestId("mock-interview")).toBeInTheDocument()
    );
    expect(screen.getByText("関わり方を教えてください")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/ijime/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログインでも保存同意だけでインタビューを開始できる", () => {
    auth.status = "unauthenticated";
    render(<PublicCommentIjimePage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    expect(
      screen.queryByRole("button", { name: /Google/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    expect(
      screen.getByRole("button", { name: "同意してはじめる" })
    ).toBeEnabled();
    expect(auth.signInWithGoogle).not.toHaveBeenCalled();
  });

  it("最終応答と安全案内を表示してから下書き作成へ進む", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            sessionId: "session-1",
            messages: [
              {
                id: "safety-message",
                role: "assistant",
                content: "今すぐ危険がある場合は110または119へ。",
                question_id: null,
              },
            ],
            quickReplies: [],
            nextStage: "draft",
          }),
          { status: 200 }
        )
    );
    render(<PublicCommentIjimePage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));

    expect(
      await screen.findByText("今すぐ危険がある場合は110または119へ。")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下書き作成へ進む" }));
    expect(
      screen.getByRole("heading", { name: "あなたの回答から下書きを作ります" })
    ).toBeInTheDocument();
  });

  it("確認済みコメントの完了後に控えメールの送信受付を表示する", async () => {
    const draft = {
      id: "draft-1",
      ai_body: "AI下書き",
      final_body: "確認済みコメント",
      target_ordinances: ["条例素案"],
      fact_check_notes: ["事実関係を公式資料で確認してください。"],
    };
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.endsWith("/session"))
          return new Response(
            JSON.stringify({
              sessionId: "session-1",
              messages: [],
              quickReplies: [],
              nextStage: "review",
              receiptOptIn: true,
              draft,
            }),
            { status: 200 }
          );
        if (url.endsWith("/draft") && init?.method === "PATCH")
          return new Response(JSON.stringify({ draft }), { status: 200 });
        if (url.endsWith("/complete"))
          return new Response(
            JSON.stringify({
              status: "private",
              receipt: { status: "accepted", canRetry: false },
            }),
            { status: 200 }
          );
        throw new Error(`Unexpected request: ${url}`);
      });

    render(<PublicCommentIjimePage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));

    expect(
      await screen.findByRole("heading", {
        name: "あなたの言葉になっているか確認してください",
      })
    ).toBeInTheDocument();
    const reviewElements = [
      screen.getByRole("textbox", { name: "提出用に編集する本文" }),
      screen.getByText("提出前に確認すること"),
      screen.getByRole("checkbox", {
        name: /控えや今後の活動・イベント案内/,
      }),
      screen.getByRole("button", { name: "確認して完了" }),
      screen.getByRole("button", { name: "本文をコピー" }),
      screen.getByRole("link", { name: "公式提出ページ" }),
      screen.getByRole("heading", { name: "参照資料" }),
    ];
    for (const [index, element] of reviewElements.entries()) {
      const nextElement = reviewElements[index + 1];
      if (!nextElement) break;
      expect(
        element.compareDocumentPosition(nextElement) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).not.toBe(0);
    }
    fireEvent.click(screen.getByRole("button", { name: "確認して完了" }));

    expect(
      await screen.findByText(/控えメールの送信を受け付けました/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "イベントの詳細を見る" })
    ).toHaveAttribute("href", "/events/youth-dialogue-2026-10-03");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/ijime/complete",
      expect.objectContaining({
        body: expect.stringContaining('"receiptOptIn":true'),
      })
    );
  });
});
