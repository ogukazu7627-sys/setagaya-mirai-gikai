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
import { PublicCommentInclusionPlanPage } from "./public-comment-page";

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

describe("PublicCommentInclusionPlanPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/inclusion-plan");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("相談窓口との違い、センシティブ情報、公式の相談導線を示す", () => {
    render(<PublicCommentInclusionPlanPage />);
    expect(
      screen.getByRole("img", {
        name: "車いす利用者や補助犬を含む人々が地域で交流するイラスト",
      })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("inclusion-plan-public-comment-hero.webp")
    );
    expect(
      screen.getByText(/個別の差別や虐待を相談・通報する窓口ではありません/)
    ).toBeInTheDocument();
    expect(screen.getByText(/診断名や利用サービス/)).toBeInTheDocument();
    expect(screen.getByText(/03-5432-2424/)).toBeInTheDocument();
    expect(screen.getByText(/03-5432-1033/)).toBeInTheDocument();
    expect(screen.getByText(/2026年10月7日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentInclusionPlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    expect(
      screen.getByRole("heading", {
        name: "第１章｜何のための計画？――暮らし全体を支える３年間の方針",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("次期せたがやインクルージョンプラン（素案）を知る６章")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/既存事業の継続・拡充と、今後具体化する内容/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/福祉サービスに加え、教育・仕事・情報・防災/)
    ).toBeInTheDocument();
  });

  it("同意後にインクルージョンプラン用APIでインタビューを開始する", async () => {
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
          quickReplies: ["自分の暮らしとの関わりから"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentInclusionPlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));

    await waitFor(() =>
      expect(screen.getByTestId("mock-interview")).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/inclusion-plan/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":true'),
      })
    );
  });

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentInclusionPlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/inclusion-plan?auth_return=1&receipt=1"
      )
    );
  });
});
