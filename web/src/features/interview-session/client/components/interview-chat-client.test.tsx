// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewChatClient } from "./interview-chat-client";

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

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mediaQueryMock.matches,
}));

vi.mock("@/hooks/use-visual-viewport-frame", () => ({
  useVisualViewportFrame: () => visualViewportFrameMock.frame,
}));

vi.mock("../hooks/use-interview-chat", () => ({
  useInterviewChat: () => ({
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
        content: "最初の質問です",
      },
    ],
    object: null,
    setInput: vi.fn(),
    stage: "chat",
    streamingQuickReplies: [],
    streamingReportData: null,
  }),
}));

vi.mock("../hooks/use-interview-timer", () => ({
  useInterviewTimer: () => ({
    isTimeUp: false,
    remainingMinutes: null,
  }),
}));

vi.mock("./interview-chat-input", () => ({
  InterviewChatInput: () => <div data-testid="interview-chat-input" />,
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

describe("InterviewChatClient mobile viewport layout", () => {
  beforeEach(() => {
    mediaQueryMock.matches = false;
    visualViewportFrameMock.frame = {
      height: 720,
      keyboardInset: 0,
      offsetLeft: 0,
      offsetTop: 0,
      width: 390,
    };
  });

  it("スマホのページ版ではvisual viewportに合わせて画面全体と入力欄を配置する", () => {
    mediaQueryMock.matches = true;
    visualViewportFrameMock.frame = {
      height: 500,
      keyboardInset: 280,
      offsetLeft: 0,
      offsetTop: 20,
      width: 390,
    };

    render(
      <InterviewChatClient
        billId="bill-1"
        billTitle="テスト案件"
        initialMessages={[]}
        layout="page"
        sessionId="session-1"
      />
    );

    const root = screen.getByTestId("interview-chat-root");
    expect(root).toHaveStyle({
      height: "500px",
      left: "0px",
      overflow: "hidden",
      position: "fixed",
      top: "20px",
      width: "390px",
    });

    const composer = screen.getByTestId("interview-chat-composer");
    expect(
      composer.style.getPropertyValue("--interview-composer-bottom-padding")
    ).toBe("10px");
    expect(screen.getByTestId("interview-chat-input")).toBeInTheDocument();
  });

  it("パネル版ではページ用のvisual viewport固定を適用しない", () => {
    mediaQueryMock.matches = true;

    render(
      <InterviewChatClient
        billId="bill-1"
        billTitle="テスト案件"
        initialMessages={[]}
        layout="panel"
        sessionId="session-1"
      />
    );

    const root = screen.getByTestId("interview-chat-root");
    expect(root).not.toHaveStyle({ position: "fixed" });
    expect(
      screen
        .getByTestId("interview-chat-composer")
        .style.getPropertyValue("--interview-composer-bottom-padding")
    ).toBe("");
  });
});
