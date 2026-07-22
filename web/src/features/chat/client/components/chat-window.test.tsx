// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "@/features/bills/shared/types";
import { ChatWindow } from "./chat-window";

const mediaQueryMock = vi.hoisted(() => ({
  matches: true,
}));

vi.mock("@/hooks/use-is-desktop", () => ({
  useIsDesktop: () => true,
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mediaQueryMock.matches,
}));

vi.mock("@/hooks/use-viewport-height", () => ({
  useViewportHeight: () => null,
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: { alt: string; src: string }) => (
    <span aria-label={alt} data-src={src} role="img" {...props} />
  ),
}));

vi.mock("./system-message", () => ({
  SystemMessage: () => <div>AI回答</div>,
}));

vi.mock("./user-message", () => ({
  UserMessage: () => <div>ユーザー質問</div>,
}));

vi.mock(
  "@/features/interview-session/client/components/interview-side-panel",
  () => ({
    InterviewSidePanel: ({
      authStatus,
      onSignInWithGoogle,
    }: {
      authStatus: string;
      onSignInWithGoogle: () => Promise<void>;
    }) => (
      <div>
        {authStatus !== "authenticated" && (
          <>
            <p>AIインタビューを使うにはGoogleログインが必要です</p>
            <button type="button" onClick={onSignInWithGoogle}>
              Google でログイン
            </button>
          </>
        )}
      </div>
    ),
  })
);

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  mediaQueryMock.matches = true;
});

function createChatState(sendMessage = vi.fn()) {
  return {
    messages: [],
    sendMessage,
    status: "ready",
    error: undefined,
  } as unknown as ChatWindowPropsForTest["chatState"];
}

type ChatWindowPropsForTest = Parameters<typeof ChatWindow>[0];

function createBillContext(
  overrides: Partial<BillWithContent> = {}
): BillWithContent {
  return {
    id: "bill-1",
    name: "テスト案件",
    item_type: "question",
    interview_enabled: true,
    tags: [],
    ...overrides,
  } as unknown as BillWithContent;
}

describe("ChatWindow auth gate", () => {
  it("未ログイン時はGoogleログインゲートを表示し、送信入口を止める", async () => {
    const sendMessage = vi.fn();
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined);

    render(
      <ChatWindow
        authStatus="unauthenticated"
        chatState={createChatState(sendMessage)}
        difficultyLevel="normal"
        isOpen
        onClose={vi.fn()}
        onSignInWithGoogle={signInWithGoogle}
        sessionId="session-1"
      />
    );

    expect(
      await screen.findByText("AIチャットを使うにはGoogleログインが必要です")
    ).toBeInTheDocument();

    const loginButton = screen.getByRole("button", {
      name: "Google でログイン",
    });
    expect(loginButton).toBeEnabled();

    const textarea = screen.getByPlaceholderText(
      "わからないことをAIに質問する"
    );
    expect(textarea).toBeDisabled();

    const sampleQuestion = screen.getByRole("button", {
      name: "みらい議会って何？",
    });
    expect(sampleQuestion).toBeDisabled();
    fireEvent.click(sampleQuestion);

    expect(sendMessage).not.toHaveBeenCalled();

    fireEvent.click(loginButton);
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("Googleログイン済みならサンプル質問を送信できる", async () => {
    const sendMessage = vi.fn();

    render(
      <ChatWindow
        authStatus="authenticated"
        chatState={createChatState(sendMessage)}
        difficultyLevel="normal"
        isOpen
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    const sampleQuestion = await screen.findByRole("button", {
      name: "みらい議会って何？",
    });
    expect(sampleQuestion).toBeEnabled();

    fireEvent.click(sampleQuestion);

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "みらい議会って何？",
      })
    );
  });

  it("公開インタビュー設定がある案件では質問とAIインタビューを切り替えられる", async () => {
    const onActiveModeChange = vi.fn();

    render(
      <ChatWindow
        activeMode="question"
        authStatus="authenticated"
        billContext={createBillContext()}
        chatState={createChatState()}
        difficultyLevel="normal"
        hasInterviewConfig
        isOpen
        onActiveModeChange={onActiveModeChange}
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    expect(
      await screen.findByRole("tab", { name: "質問" })
    ).toBeInTheDocument();
    const interviewTab = screen.getByRole("tab", {
      name: "AIインタビュー",
    });

    fireEvent.click(interviewTab);

    expect(onActiveModeChange).toHaveBeenCalledWith("interview");
  });

  it("interview_enabled=falseの案件ではAIインタビュータブを表示しない", () => {
    render(
      <ChatWindow
        authStatus="authenticated"
        billContext={createBillContext({ interview_enabled: false })}
        chatState={createChatState()}
        difficultyLevel="normal"
        hasInterviewConfig
        isOpen
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    expect(
      screen.queryByRole("tab", { name: "AIインタビュー" })
    ).not.toBeInTheDocument();
  });

  it("スマホ幅では公開インタビュー設定があってもAIインタビュータブを表示しない", () => {
    const onActiveModeChange = vi.fn();
    mediaQueryMock.matches = false;

    render(
      <ChatWindow
        activeMode="interview"
        authStatus="authenticated"
        billContext={createBillContext()}
        chatState={createChatState()}
        difficultyLevel="normal"
        hasInterviewConfig
        isOpen
        onActiveModeChange={onActiveModeChange}
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    expect(screen.queryByRole("tab", { name: "質問" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "AIインタビュー" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("わからないことをAIに質問する")
    ).toBeInTheDocument();
    expect(onActiveModeChange).toHaveBeenCalledWith("question");
  });

  it("未ログインでAIインタビューを開くとGoogleログインゲートを表示する", async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined);

    render(
      <ChatWindow
        activeMode="interview"
        authStatus="unauthenticated"
        billContext={createBillContext()}
        chatState={createChatState()}
        difficultyLevel="normal"
        hasInterviewConfig
        isOpen
        onClose={vi.fn()}
        onSignInWithGoogle={signInWithGoogle}
        sessionId="session-1"
      />
    );

    expect(
      await screen.findByText(
        "AIインタビューを使うにはGoogleログインが必要です"
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});
