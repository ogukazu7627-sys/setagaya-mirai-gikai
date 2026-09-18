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
import { PublicCommentGenderEqualityPage } from "./public-comment-page";

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

describe("PublicCommentGenderEqualityPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/gender-equality");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("センシティブ情報への配慮、緊急時の案内、公式の相談導線を示す", () => {
    render(<PublicCommentGenderEqualityPage />);
    expect(
      screen.getByRole("img", {
        name: "幅広い年代や立場の人が地域で交流するイラスト",
      })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("gender-equality-public-comment-hero.webp")
    );
    expect(screen.getByText(/性的指向・性自認/)).toBeInTheDocument();
    expect(screen.getByText(/氏名、住所、学校名、勤務先/)).toBeInTheDocument();
    expect(screen.getByText(/110（警察）/)).toBeInTheDocument();
    expect(screen.getByText(/119/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "DV相談窓口一覧" })
    ).toHaveAttribute(
      "href",
      "https://www.city.setagaya.lg.jp/02409/1025.html"
    );
    expect(screen.getByText(/2026年10月6日/)).toBeInTheDocument();
  });

  it("指定された6章の学習導線を表示する", () => {
    render(<PublicCommentGenderEqualityPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    expect(
      screen.getByRole("heading", {
        name: "第１章　何のための計画？――性別に左右されない選択と参加を支える",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("世田谷区第三次男女共同参画プラン（素案）を知る６章")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/新たな取組だけでなく、既存事業の継続・充実/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/女性の就職や昇進に関する支援だけ/)
    ).toBeInTheDocument();
  });

  it("同意後に男女共同参画プラン用APIでインタビューを開始する", async () => {
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
          quickReplies: ["制度や地域社会への関心から"],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentGenderEqualityPage />);
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
      "/api/public-comment/gender-equality/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"receiptOptIn":false'),
      })
    );
  });

  it("未ログインでも保存同意だけでインタビューを開始できる", () => {
    auth.status = "unauthenticated";
    render(<PublicCommentGenderEqualityPage />);
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
});
