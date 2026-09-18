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
import { PublicCommentDementiaHopePlanPage } from "./public-comment-page";

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

describe("PublicCommentDementiaHopePlanPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/dementia-hope-plan");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("診断・相談窓口との違い、センシティブ情報、公式の相談導線を示す", () => {
    render(<PublicCommentDementiaHopePlanPage />);
    expect(
      screen.getByRole("img", { name: "話を丁寧に聴く人のイラスト" })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("interview-illustration.png")
    );
    expect(
      screen.getByText(/認知症の診断、個別の医療・介護相談/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/詳しい病状・診断名・要介護度/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "もの忘れ相談窓口" })
    ).toHaveAttribute(
      "href",
      "https://www.city.setagaya.lg.jp/02087/2947.html"
    );
    expect(screen.getByText(/2026年9月29日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentDementiaHopePlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    expect(
      screen.getByRole("heading", {
        name: "第１章｜何のための計画？――本人の意思を大切にしながら、暮らしを支える",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("認知症になってからの暮らしを、世田谷区はどう支える？")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/数値目標など、今後具体化・確定/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/認知症になってからも、本人の意思や権利が尊重/)
    ).toBeInTheDocument();
  });

  it("同意後に認知症希望計画用APIでインタビューを開始する", async () => {
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
          quickReplies: ["自分の暮らしや将来への関心から"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentDementiaHopePlanPage />);
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
      "/api/public-comment/dementia-hope-plan/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentDementiaHopePlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/dementia-hope-plan?auth_return=1"
      )
    );
  });
});
