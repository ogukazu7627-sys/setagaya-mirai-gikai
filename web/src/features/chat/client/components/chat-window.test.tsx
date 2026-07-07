// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ChatWindow } from "./chat-window";

vi.mock("@/hooks/use-is-desktop", () => ({
  useIsDesktop: () => true,
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

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
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
});
