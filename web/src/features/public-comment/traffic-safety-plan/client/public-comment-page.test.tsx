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
import { PublicCommentTrafficSafetyPlanPage } from "./public-comment-page";

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

describe("PublicCommentTrafficSafetyPlanPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(
      null,
      "",
      "/public-comment/traffic-safety-plan"
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("テーマ別の中央見出しとインタビュー優先の開始導線を表示する", () => {
    render(<PublicCommentTrafficSafetyPlanPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /AIパブコメインタビュー.*第12次世田谷区交通安全計画/,
      })
    ).toHaveClass("text-center");
    expect(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    ).toHaveClass("bg-mirai-gradient");
    expect(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    ).toHaveClass("underline");
  });

  it("通報窓口との違い、個人・場所の特定防止、公式情報を示す", () => {
    render(<PublicCommentTrafficSafetyPlanPage />);
    expect(
      screen.getByRole("img", {
        name: "子どもや高齢者、自転車利用者が道路を安全に通行するイラスト",
      })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("traffic-safety-plan-public-comment-hero.webp")
    );
    expect(
      screen.getByText(/個別の事故・違反・道路危険箇所の通報窓口ではありません/)
    ).toBeInTheDocument();
    expect(screen.getByText(/道路名・交差点名/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "公式の意見募集ページ" })
    ).toHaveAttribute(
      "href",
      "https://www.city.setagaya.lg.jp/01420/34158.html"
    );
    expect(screen.getByText(/2026年10月6日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentTrafficSafetyPlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    expect(
      screen.getByRole("heading", {
        name: "第１章｜この計画で、何を目指しているの？",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("第12次世田谷区交通安全計画（素案）を知る６章")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/個別の対策場所や時期がすべて決まったわけではありません/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/交通事故の死者数０人、負傷者数1,650人以下/)
    ).toBeInTheDocument();
  });

  it("同意後に交通安全計画用APIでインタビューを開始する", async () => {
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
          quickReplies: ["徒歩や車いすで移動する立場から"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentTrafficSafetyPlanPage />);
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
      "/api/public-comment/traffic-safety-plan/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログイン時は認証後に同じページへ戻す", async () => {
    auth.status = "unauthenticated";
    render(<PublicCommentTrafficSafetyPlanPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/traffic-safety-plan?auth_return=1"
      )
    );
  });
});
