// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCommentInterviewChat } from "./public-comment-interview-chat";

vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation">{children}</div>
  ),
  ConversationContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./public-comment-chat-scroll", () => ({
  PublicCommentChatScroll: () => null,
}));

const first = {
  id: "q1",
  role: "assistant" as const,
  content: "関わり方を教えてください",
  question_id: "relationship",
};
const select = vi.fn();

function Chat({
  question = first,
  isLoading = false,
  error = null,
}: {
  question?: typeof first;
  isLoading?: boolean;
  error?: string | null;
}) {
  const [answer, setAnswer] = useState("");
  return (
    <PublicCommentInterviewChat
      messages={[question]}
      quickReplies={["近隣で暮らしている"]}
      isLoading={isLoading}
      error={error}
      answer={answer}
      onAnswerChange={setAnswer}
      onSubmit={vi.fn()}
      onQuickReply={select}
    />
  );
}

describe("民泊インタビューの選択肢表示", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    select.mockClear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  const advance = (time: number) => act(() => vi.advanceTimersByTime(time));

  it("モバイルでは固定ナビの高さを確保し、PCでは元の高さを使う", () => {
    render(<Chat />);
    expect(screen.getByTestId("public-comment-interview-chat")).toHaveClass(
      "h-[calc(100dvh-var(--app-header-layout-offset)-var(--mobile-primary-navigation-layout-offset))]",
      "pc:h-[calc(100dvh-var(--app-header-layout-offset))]"
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "民泊パブリックコメントのAIインタビュー"
    );
  });

  it("初期状態では選択肢が存在せず、未入力5秒後に操作できる", () => {
    render(<Chat />);
    advance(4_999);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    advance(1);
    const reply = screen.getByRole("button", { name: "近隣で暮らしている" });
    expect(reply).toBeEnabled();
    expect(screen.getByTestId("public-comment-composer")).toContainElement(
      reply
    );
    expect(screen.getByTestId("conversation")).not.toContainElement(reply);
    fireEvent.click(reply);
    expect(select).toHaveBeenCalledWith("近隣で暮らしている");
  });

  it("応答待ちでも入力欄を再作成・無効化せず、送信だけを無効化する", () => {
    vi.mocked(window.matchMedia).mockImplementation((query) => ({
      matches: query === "(max-width: 999px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const { rerender } = render(<Chat />);
    const input = screen.getByRole("textbox");
    const chat = screen.getByTestId("public-comment-interview-chat");
    expect(chat.style.height).toContain("mobile-primary-navigation");
    act(() => input.focus());
    expect(input).toHaveFocus();
    expect(chat.style.height).not.toContain("mobile-primary-navigation");
    expect(
      screen.queryByText("個人情報や機密情報は記入しないでください")
    ).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "確認用の回答" } });
    expect(screen.getByRole("button", { name: "送信" })).toBeEnabled();
    rerender(<Chat isLoading />);
    expect(screen.getByRole("textbox")).toBe(input);
    expect(input).toBeEnabled();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "送信" })).toBeDisabled();
    rerender(<Chat />);
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "送信" })).toBeEnabled();
    act(() => input.blur());
    expect(chat.style.height).toContain("mobile-primary-navigation");
    expect(
      screen.getByText("個人情報や機密情報は記入しないでください")
    ).toBeInTheDocument();
  });

  it("一度入力した質問では、全削除しても選択肢を表示しない", () => {
    render(<Chat />);
    advance(4_000);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "暮らしている" },
    });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    advance(30_000);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
  });

  it("新しい質問では改めて5秒待ち、表示後に入力すると消える", () => {
    const { rerender } = render(<Chat />);
    advance(5_000);
    expect(
      screen.getByRole("button", { name: "近隣で暮らしている" })
    ).toBeInTheDocument();
    rerender(<Chat question={{ ...first, id: "q2", content: "次の質問" }} />);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    advance(4_999);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    advance(1);
    expect(
      screen.getByRole("button", { name: "近隣で暮らしている" })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "自分の意見" },
    });
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    advance(10_000);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
  });

  it("読み込み中・エラー中は表示せず、応答完了から5秒待つ", () => {
    const { rerender } = render(<Chat isLoading />);
    advance(20_000);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    rerender(<Chat />);
    advance(4_999);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    advance(1);
    expect(
      screen.getByRole("button", { name: "近隣で暮らしている" })
    ).toBeInTheDocument();
    rerender(<Chat error="通信エラー" />);
    advance(20_000);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
  });

  it("質問変更・アンマウント時は古いタイマーを破棄する", () => {
    const { rerender, unmount } = render(<Chat />);
    advance(4_000);
    rerender(<Chat question={{ ...first, id: "q2" }} />);
    advance(1_000);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("入力済みの質問の後も、新しい質問では5秒後に選択肢が表示される", () => {
    const { rerender } = render(<Chat />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: " " },
    });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    advance(5_000);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    rerender(<Chat question={{ ...first, id: "q2" }} />);
    advance(4_999);
    expect(
      screen.queryByRole("button", { name: "近隣で暮らしている" })
    ).not.toBeInTheDocument();
    advance(1);
    expect(
      screen.getByRole("button", { name: "近隣で暮らしている" })
    ).toBeInTheDocument();
  });
});
