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
import { PublicCommentSuicidePreventionPage } from "./public-comment-page";

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
    }: {
      messages: Array<{ id: string; content: string }>;
    }) => (
      <div data-testid="mock-interview">
        {messages.map((message) => (
          <p key={message.id}>{message.content}</p>
        ))}
      </div>
    ),
  })
);

describe("PublicCommentSuicidePreventionPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/suicide-prevention");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("相談窓口との違い、緊急時の連絡先、公式の相談導線を示す", () => {
    render(<PublicCommentSuicidePreventionPage />);

    expect(screen.getByText(/こころの相談、診断・治療/)).toBeInTheDocument();
    expect(screen.getByText(/119（救急）または110/)).toBeInTheDocument();
    expect(screen.getByText(/03-6276-0044/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "まもろうよ こころ" })
    ).toHaveAttribute("href", "https://www.mhlw.go.jp/mamorouyokokoro/soudan/");
    expect(screen.getByText(/2026年10月6日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentSuicidePreventionPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );

    expect(
      screen.getByRole("heading", {
        name: "第１章｜何のための計画？――こころと暮らしを支える取組を組み直す",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("区民が知っておきたい６つのこと")
    ).toBeInTheDocument();
    expect(screen.getByText(/2027〜2031年度の５年間/)).toBeInTheDocument();
  });

  it("同意後に自殺対策計画用APIでインタビューを開始する", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: "session-1",
          messages: [
            {
              id: "question-1",
              role: "assistant",
              content: "どのような立場や関心から意見を伝えたいですか？",
              question_id: "relationship",
            },
          ],
          quickReplies: ["区民として"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentSuicidePreventionPage />);
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/suicide-prevention/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentSuicidePreventionPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));

    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/suicide-prevention?auth_return=1"
      )
    );
  });
});
