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
    <div>{children}</div>
  ),
  ConversationContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  const advance = (time: number) => act(() => vi.advanceTimersByTime(time));

  it("下部ナビの余白を引かない高さを使う", () => {
    render(<Chat />);
    expect(screen.getByTestId("public-comment-interview-chat")).toHaveClass(
      "h-[calc(100dvh-var(--app-header-layout-offset))]"
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
    fireEvent.click(reply);
    expect(select).toHaveBeenCalledWith("近隣で暮らしている");
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
