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
import { PublicCommentRetainingWallPage } from "./public-comment-page";

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

describe("PublicCommentRetainingWallPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/retaining-wall");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("安全判定・補助申請との違い、個人情報、公式の相談導線を示す", () => {
    render(<PublicCommentRetainingWallPage />);
    expect(
      screen.getByRole("img", {
        name: "住宅地のがけ・擁壁を住民と専門家が確認するイラスト",
      })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("retaining-wall-public-comment-hero.webp")
    );
    expect(screen.getByText(/個別のがけ・擁壁の安全判定/)).toBeInTheDocument();
    expect(screen.getByText(/正確な住所・地番/)).toBeInTheDocument();
    expect(screen.getByText(/119または110/)).toBeInTheDocument();
    expect(screen.getByText(/03-6432-7158/)).toBeInTheDocument();
    expect(screen.getByText(/2026年10月6日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentRetainingWallPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    expect(
      screen.getByRole("heading", {
        name: "第１章　何のための方針？――崩れる前に、危険を減らす",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("世田谷区の「がけ・擁壁」対策は、どう変わる？")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/新たな補助制度などは検討段階/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/崩壊する前に、状態を確認して必要な対策を行う/)
    ).toBeInTheDocument();
  });

  it("同意後にがけ・擁壁方針用APIでインタビューを開始する", async () => {
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
          quickReplies: ["所有者として"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentRetainingWallPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/retaining-wall/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentRetainingWallPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/retaining-wall?auth_return=1"
      )
    );
  });
});
