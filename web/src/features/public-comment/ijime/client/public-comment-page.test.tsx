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

  it("センシティブなテーマでは控えメールを表示せず、同意後に専用APIで開始する", async () => {
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
        name: "すぐにAIインタビューをはじめる",
      })[0]
    );
    expect(
      screen.queryByText(/控えをメールで受け取る/)
    ).not.toBeInTheDocument();
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

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentIjimePage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "すぐにAIインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/ijime?auth_return=1"
      )
    );
  });

  it("最終応答と安全案内を表示してから下書き作成へ進む", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
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
        name: "すぐにAIインタビューをはじめる",
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
});
