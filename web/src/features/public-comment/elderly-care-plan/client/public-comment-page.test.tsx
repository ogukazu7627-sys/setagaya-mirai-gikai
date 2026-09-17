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
import { PublicCommentElderlyCarePlanPage } from "./public-comment-page";

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

describe("PublicCommentElderlyCarePlanPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/elderly-care-plan");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("相談窓口との違い、センシティブ情報、公式の相談導線を示す", () => {
    render(<PublicCommentElderlyCarePlanPage />);
    expect(
      screen.getByRole("img", { name: "話を丁寧に聴く人のイラスト" })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("interview-illustration.png")
    );
    expect(
      screen.getByText(
        /個別の医療・介護相談や、介護保険の申請窓口ではありません/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/詳しい病状・診断名・要介護度/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "あんしんすこやかセンター" })
    ).toHaveAttribute(
      "href",
      "https://www.city.setagaya.lg.jp/02087/2428.html"
    );
    expect(screen.getByText(/2026年9月29日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentElderlyCarePlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /計画素案について学ぶ/ })[0]
    );
    expect(
      screen.getByRole("heading", {
        name: "第1章　何のための計画？――高齢期の暮らしを、まとめて考える",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "第10期世田谷区高齢者保健福祉計画・介護保険事業計画（素案）"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/介護保険料や一部の目標値など、今後具体化・確定/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/健康づくり、社会参加、相談、住まい/)
    ).toBeInTheDocument();
  });

  it("同意後に高齢・介護計画用APIでインタビューを開始する", async () => {
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
          quickReplies: ["自分の高齢期の暮らしから"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentElderlyCarePlanPage />);
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
      "/api/public-comment/elderly-care-plan/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentElderlyCarePlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "すぐにAIインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/elderly-care-plan?auth_return=1"
      )
    );
  });
});
