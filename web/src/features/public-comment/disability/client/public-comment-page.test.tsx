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
import { PublicCommentDisabilityPage } from "./public-comment-page";

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

describe("PublicCommentDisabilityPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/disability");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("相談窓口との違い、センシティブ情報、公式の相談導線を示す", () => {
    render(<PublicCommentDisabilityPage />);
    expect(
      screen.getByText(/個別の差別や虐待を相談・通報する窓口ではありません/)
    ).toBeInTheDocument();
    expect(screen.getByText(/診断名や利用サービス/)).toBeInTheDocument();
    expect(screen.getByText(/03-5432-2424/)).toBeInTheDocument();
    expect(screen.getByText(/03-5432-1033/)).toBeInTheDocument();
    expect(screen.getByText(/2026年10月7日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentDisabilityPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /条例素案について学ぶ/ })[0]
    );
    expect(
      screen.getByRole("heading", {
        name: "第１章　「障害への理解」は、気持ちの問題だけではない",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("障害理解の条例改正で、何が変わる？")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/改正内容は、まだ確定していません/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/本人の状態と、設備や制度などの障壁との関係/)
    ).toBeInTheDocument();
  });

  it("同意後に障害理解条例用APIでインタビューを開始する", async () => {
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
          quickReplies: ["本人として"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentDisabilityPage />);
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/disability/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentDisabilityPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "すぐにAIインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/disability?auth_return=1"
      )
    );
  });
});
