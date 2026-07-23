// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { act, useState } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "@/features/bills/shared/types";
import { ChatWindow } from "./chat-window";

const mediaQueryMock = vi.hoisted(() => ({
  matches: true,
}));
const desktopMock = vi.hoisted(() => ({
  isDesktop: true,
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

vi.mock("@/hooks/use-is-desktop", () => ({
  useIsDesktop: () => desktopMock.isDesktop,
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mediaQueryMock.matches,
}));

vi.mock("@/hooks/use-visual-viewport-frame", () => ({
  useVisualViewportFrame: () => visualViewportFrameMock.frame,
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
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mediaQueryMock.matches = true;
  desktopMock.isDesktop = true;
  visualViewportFrameMock.frame = {
    height: 720,
    keyboardInset: 0,
    offsetLeft: 0,
    offsetTop: 0,
    width: 390,
  };
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: 0,
  });
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

function MobileChatHarness() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <ChatWindow
      authStatus="authenticated"
      chatState={createChatState()}
      difficultyLevel="normal"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSignInWithGoogle={vi.fn()}
      sessionId="session-1"
    />
  );
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
    desktopMock.isDesktop = false;

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

  it("スマホのclosed状態ではdialogも操作可能なtextareaも描画しない", () => {
    mediaQueryMock.matches = false;
    desktopMock.isDesktop = false;

    render(
      <ChatWindow
        authStatus="authenticated"
        chatState={createChatState()}
        difficultyLevel="normal"
        isOpen={false}
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("わからないことをAIに質問する")
    ).not.toBeInTheDocument();
  });

  it("スマホのpreviewではvisual viewport内に不透明なシートを表示し、textareaを自動focusしない", () => {
    mediaQueryMock.matches = false;
    desktopMock.isDesktop = false;
    visualViewportFrameMock.frame = {
      height: 640,
      keyboardInset: 0,
      offsetLeft: 4,
      offsetTop: 20,
      width: 390,
    };

    render(
      <ChatWindow
        authStatus="authenticated"
        chatState={createChatState()}
        difficultyLevel="normal"
        isOpen
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    const overlay = screen.getByTestId("chat-window-overlay");
    const sheet = screen.getByTestId("chat-window-sheet");
    const textarea = screen.getByPlaceholderText(
      "わからないことをAIに質問する"
    );

    expect(screen.getByRole("dialog", { name: "AIに質問する" })).toBeVisible();
    expect(overlay).toHaveStyle({
      height: "640px",
      left: "4px",
      top: "20px",
      width: "390px",
    });
    expect(overlay.style.getPropertyValue("--visual-viewport-height")).toBe(
      "640px"
    );
    expect(overlay.style.getPropertyValue("--visual-viewport-top")).toBe(
      "20px"
    );
    expect(sheet).toHaveStyle({
      height: "82%",
    });
    expect(sheet).toHaveAttribute("data-chat-phase", "preview");
    expect(sheet).toHaveClass("bg-white", "opacity-100", "isolate");
    expect(sheet.style.getPropertyValue("--chat-composer-bottom-padding")).toBe(
      "max(10px, env(safe-area-inset-bottom))"
    );
    expect(document.activeElement).not.toBe(textarea);
    expect(screen.getByTestId("chat-window-backdrop")).toHaveClass(
      "bg-black/50"
    );
  });

  it("同じtextareaのままpreviewとcomposingを切り替え、blurしてもdialogを閉じない", () => {
    mediaQueryMock.matches = false;
    desktopMock.isDesktop = false;

    render(
      <ChatWindow
        authStatus="authenticated"
        chatState={createChatState()}
        difficultyLevel="normal"
        isOpen
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    const sheet = screen.getByTestId("chat-window-sheet");
    const textarea = screen.getByPlaceholderText(
      "わからないことをAIに質問する"
    );

    fireEvent.change(textarea, { target: { value: "入力途中の質問" } });
    act(() => {
      textarea.focus();
    });

    expect(sheet).toHaveAttribute("data-chat-phase", "composing");
    expect(sheet).toHaveStyle({ height: "100%" });
    expect(sheet.style.getPropertyValue("--chat-composer-bottom-padding")).toBe(
      "10px"
    );
    expect(screen.getByTestId("chat-window-feedback")).toHaveClass(
      "order-1",
      "mb-2"
    );
    expect(screen.getByPlaceholderText("わからないことをAIに質問する")).toBe(
      textarea
    );

    fireEvent.blur(textarea);

    expect(screen.getByRole("dialog", { name: "AIに質問する" })).toBeVisible();
    expect(sheet).toHaveAttribute("data-chat-phase", "preview");
    expect(screen.getByTestId("chat-window-feedback")).toHaveClass("order-2");
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("入力途中の質問");
    expect(screen.getByPlaceholderText("わからないことをAIに質問する")).toBe(
      textarea
    );
  });

  it("composerをscroll areaの外側かつ同じ白いシート内に配置する", () => {
    mediaQueryMock.matches = false;
    desktopMock.isDesktop = false;

    render(
      <ChatWindow
        authStatus="authenticated"
        chatState={createChatState()}
        difficultyLevel="normal"
        isOpen
        onClose={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        sessionId="session-1"
      />
    );

    const sheet = screen.getByTestId("chat-window-sheet");
    const scrollArea = screen.getByTestId("chat-window-scroll-area");
    const composer = screen.getByTestId("chat-window-composer");

    expect(sheet).toContainElement(scrollArea);
    expect(sheet).toContainElement(composer);
    expect(scrollArea).not.toContainElement(composer);
  });

  it("送信ボタン操作ではtextareaをblurせず、日本語IME変換中は送信しない", () => {
    mediaQueryMock.matches = false;
    desktopMock.isDesktop = false;
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

    const textarea = screen.getByPlaceholderText(
      "わからないことをAIに質問する"
    );
    const sendButton = screen.getByRole("button", { name: "送信" });
    const form = textarea.closest("form");

    if (!form) {
      throw new Error("送信フォームが見つかりません");
    }
    Object.defineProperty(form, "message", {
      configurable: true,
      value: textarea,
    });

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: "変換中の質問" } });
    fireEvent.compositionStart(textarea);
    fireEvent.submit(form);
    expect(sendMessage).not.toHaveBeenCalled();

    fireEvent.compositionEnd(textarea);
    act(() => {
      textarea.focus();
    });
    expect(document.activeElement).toBe(textarea);
    fireEvent.pointerDown(sendButton);

    expect(document.activeElement).toBe(textarea);
    expect(screen.getByTestId("chat-window-sheet")).toHaveAttribute(
      "data-chat-phase",
      "composing"
    );
  });

  it("×でclosedへ戻り、背景スクロール位置を復元する", () => {
    mediaQueryMock.matches = false;
    desktopMock.isDesktop = false;
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 320,
    });

    render(<MobileChatHarness />);

    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-320px");

    fireEvent.click(screen.getByRole("button", { name: "AI質問を閉じる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 320);
  });

  it("背景タップでclosedへ戻る", () => {
    mediaQueryMock.matches = false;
    desktopMock.isDesktop = false;

    render(<MobileChatHarness />);

    fireEvent.click(screen.getByTestId("chat-window-backdrop"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
