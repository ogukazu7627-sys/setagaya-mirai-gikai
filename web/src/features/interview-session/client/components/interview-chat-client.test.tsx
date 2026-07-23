// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewChatClient } from "./interview-chat-client";

type MockInterviewMessage = {
  content: string;
  id: string;
  role: "assistant" | "user";
};

const mediaQueryMock = vi.hoisted(() => ({
  matches: false,
}));
const visualViewportFrameMock = vi.hoisted(() => ({
  frame: {
    height: 720,
    keyboardInset: 0,
    offsetLeft: 0,
    offsetTop: 0,
    width: 390,
  },
}));
const interviewChatMock = vi.hoisted(() => ({
  state: {
    canRetry: false,
    currentQuickReplies: [] as string[],
    error: null,
    handleQuickReply: vi.fn(),
    handleResumeInterview: vi.fn(),
    handleRetry: vi.fn(),
    handleSubmit: vi.fn(),
    input: "",
    isLoading: false,
    messages: [
      {
        id: "message-1",
        role: "assistant" as const,
        content: "現在回答すべき質問です",
      },
    ] as MockInterviewMessage[],
    object: null as {
      text?: string;
      next_stage?: "chat" | "summary" | "summary_complete";
    } | null,
    setInput: vi.fn(),
    stage: "chat" as "chat" | "summary" | "summary_complete",
    streamingQuickReplies: [] as string[],
    streamingReportData: null,
  },
}));

vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="interview-scroll-content">
      {children}
    </div>
  ),
  ConversationContent: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("@/hooks/use-is-desktop", () => ({
  useIsDesktop: () => false,
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mediaQueryMock.matches,
}));

vi.mock("@/hooks/use-visual-viewport-frame", () => ({
  useVisualViewportFrame: () => visualViewportFrameMock.frame,
}));

vi.mock("../hooks/use-interview-chat", () => ({
  useInterviewChat: () => interviewChatMock.state,
}));

vi.mock("../hooks/use-interview-timer", () => ({
  useInterviewTimer: () => ({
    isTimeUp: false,
    remainingMinutes: 1,
  }),
}));

vi.mock("./interview-error-display", () => ({
  InterviewErrorDisplay: () => null,
}));

vi.mock("./interview-message", () => ({
  InterviewMessage: ({
    message,
  }: {
    message: { parts: Array<{ text: string }> };
  }) => <p>{message.parts[0]?.text}</p>,
}));

vi.mock("./interview-progress-bar", () => ({
  InterviewProgressBar: () => <div data-testid="interview-progress-bar" />,
}));

vi.mock("./quick-reply-buttons", () => ({
  QuickReplyButtons: () => null,
}));

vi.mock("./skip-action-popover", () => ({
  SkipActionPopover: () => null,
}));

vi.mock("./interview-summary-input", () => ({
  InterviewSummaryInput: () => <div data-testid="interview-summary-input" />,
}));

vi.mock("./time-up-prompt", () => ({
  TimeUpPrompt: () => null,
}));

function renderClient(layout: "page" | "panel" = "page") {
  return render(
    <InterviewChatClient
      billId="bill-1"
      billTitle="テスト案件"
      initialMessages={[]}
      layout={layout}
      sessionId="session-1"
    />
  );
}

describe("InterviewChatClient mobile answer focus mode", () => {
  const scrollToMock = vi.fn();

  beforeEach(() => {
    mediaQueryMock.matches = false;
    visualViewportFrameMock.frame = {
      height: 720,
      keyboardInset: 0,
      offsetLeft: 0,
      offsetTop: 0,
      width: 390,
    };
    interviewChatMock.state = {
      canRetry: false,
      currentQuickReplies: [],
      error: null,
      handleQuickReply: vi.fn(),
      handleResumeInterview: vi.fn(),
      handleRetry: vi.fn(),
      handleSubmit: vi.fn(),
      input: "",
      isLoading: false,
      messages: [
        {
          id: "message-1",
          role: "assistant",
          content: "現在回答すべき質問です",
        },
      ],
      object: null,
      setInput: vi.fn(),
      stage: "chat",
      streamingQuickReplies: [],
      streamingReportData: null,
    };
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn(() => 1),
    });
    document.body.style.cssText = "";
    document.documentElement.style.cssText = "";
    scrollToMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("入力タップ時だけvisual viewport内へ質問と単一inputをPortal表示する", () => {
    mediaQueryMock.matches = true;
    visualViewportFrameMock.frame = {
      height: 500,
      keyboardInset: 280,
      offsetLeft: 4,
      offsetTop: 20,
      width: 382,
    };

    renderClient();

    const root = screen.getByTestId("interview-chat-root");
    expect(root).not.toHaveStyle({ position: "fixed" });
    expect(
      screen.queryByTestId("interview-answer-focus-layer")
    ).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("textbox"));

    const focusLayer = screen.getByTestId("interview-answer-focus-layer");
    expect(focusLayer).toHaveStyle({
      height: "500px",
      left: "4px",
      top: "20px",
      width: "382px",
    });
    expect(focusLayer).toHaveClass("fixed");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);

    const answerDock = screen.getByTestId("interview-answer-dock");
    expect(
      within(answerDock).getByText("現在回答すべき質問です")
    ).toBeInTheDocument();
    expect(within(answerDock).getByRole("textbox")).toBeInTheDocument();
    expect(document.body.style.position).toBe("fixed");
  });

  it("キーボード完了相当のblurで通常画面へ戻してスクロール位置を復元する", () => {
    mediaQueryMock.matches = true;
    interviewChatMock.state.input = "回答内容";
    renderClient();

    const normalTextbox = screen.getByRole("textbox") as HTMLTextAreaElement;
    normalTextbox.setSelectionRange(1, 3);
    fireEvent.pointerDown(normalTextbox);
    const focusedTextbox = within(
      screen.getByTestId("interview-answer-dock")
    ).getByRole("textbox") as HTMLTextAreaElement;
    expect(focusedTextbox.selectionStart).toBe(1);
    expect(focusedTextbox.selectionEnd).toBe(3);
    fireEvent.blur(focusedTextbox);

    expect(
      screen.queryByTestId("interview-answer-focus-layer")
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    const restoredTextbox = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(restoredTextbox.selectionStart).toBe(1);
    expect(restoredTextbox.selectionEnd).toBe(3);
    expect(scrollToMock).toHaveBeenCalledWith(0, 240);
  });

  it("送信ボタン操作によるblurでは回答フォーカスモードを維持する", () => {
    mediaQueryMock.matches = true;
    interviewChatMock.state.input = "回答内容";
    renderClient();

    fireEvent.pointerDown(screen.getByRole("textbox"));
    const answerDock = screen.getByTestId("interview-answer-dock");
    fireEvent.pointerDown(
      within(answerDock).getByRole("button", { name: "送信" })
    );
    fireEvent.blur(within(answerDock).getByRole("textbox"));

    expect(
      screen.getByTestId("interview-answer-focus-layer")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("質問生成中は同じ質問カード内でストリーミング文へ差し替える", () => {
    mediaQueryMock.matches = true;
    const view = renderClient();
    fireEvent.pointerDown(screen.getByRole("textbox"));

    interviewChatMock.state.isLoading = true;
    interviewChatMock.state.messages = [
      {
        id: "message-1",
        role: "assistant",
        content: "現在回答すべき質問です",
      },
      {
        id: "message-2",
        role: "user",
        content: "回答内容",
      },
    ];
    view.rerender(
      <InterviewChatClient
        billId="bill-1"
        billTitle="テスト案件"
        initialMessages={[]}
        layout="page"
        sessionId="session-1"
      />
    );
    expect(screen.getByText("次の質問を考えています…")).toBeInTheDocument();

    interviewChatMock.state.object = {
      text: "生成中の新しい質問です",
      next_stage: "chat",
    };
    view.rerender(
      <InterviewChatClient
        billId="bill-1"
        billTitle="テスト案件"
        initialMessages={[]}
        layout="page"
        sessionId="session-1"
      />
    );
    expect(
      within(screen.getByTestId("interview-latest-question")).getByText(
        "生成中の新しい質問です"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("パネル版では回答フォーカスモードを開かない", () => {
    mediaQueryMock.matches = true;
    renderClient("panel");

    fireEvent.pointerDown(screen.getByRole("textbox"));

    expect(
      screen.queryByTestId("interview-answer-focus-layer")
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("デスクトップ版では回答フォーカスモードを開かない", () => {
    mediaQueryMock.matches = false;
    renderClient();

    fireEvent.pointerDown(screen.getByRole("textbox"));

    expect(
      screen.queryByTestId("interview-answer-focus-layer")
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });
});
