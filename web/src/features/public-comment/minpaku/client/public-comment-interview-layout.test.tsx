// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Footer } from "@/components/layouts/footer/footer";
import { InterviewLayoutProvider } from "@/components/layouts/interview-layout-context";
import { MainLayout } from "@/components/layouts/main-layout";
import { MobileBottomNavigation } from "@/features/primary-navigation/client/components/mobile-bottom-navigation";
import { PublicCommentInterviewChat } from "./public-comment-interview-chat";

const browser = vi.hoisted(() => ({
  pathname: "/public-comment/minpaku",
  frame: {
    height: 800,
    width: 390,
    keyboardInset: 0,
    offsetTop: 0,
    offsetLeft: 0,
  },
}));

vi.mock("next/navigation", () => ({ usePathname: () => browser.pathname }));
vi.mock("@/hooks/use-visual-viewport-frame", () => ({
  useVisualViewportFrame: () => browser.frame,
}));
vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ConversationContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

function Page({
  interview,
  navigationKey = 0,
}: {
  interview: boolean;
  navigationKey?: number;
}) {
  return (
    <StrictMode>
      <InterviewLayoutProvider>
        <MainLayout>
          <main>
            {interview ? (
              <PublicCommentInterviewChat
                mode="loop"
                progress={{
                  percentage: 0,
                  currentTopic: "関わり方",
                  remainingQuestionRange: { min: 21, max: 21 },
                  paused: false,
                }}
                onAction={vi.fn()}
                messages={[
                  {
                    id: "q1",
                    role: "assistant",
                    content: "関わり方を教えてください",
                  },
                ]}
                quickReplies={[]}
                isLoading={false}
                error={null}
                answer=""
                onAnswerChange={vi.fn()}
                onSubmit={vi.fn()}
                onQuickReply={vi.fn()}
              />
            ) : (
              <textarea aria-label="通常画面の入力" />
            )}
          </main>
          <Footer />
        </MainLayout>
        <MobileBottomNavigation key={navigationKey} />
      </InterviewLayoutProvider>
    </StrictMode>
  );
}

function expectChromeAbsent() {
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "主要ナビゲーション" })
  ).not.toBeInTheDocument();
}

describe("民泊インタビュー中の下部表示", () => {
  beforeEach(() => {
    browser.pathname = "/public-comment/minpaku";
    browser.frame.keyboardInset = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("開始時にフッターとナビのDOMを取り除き、下書き確認へ進むと復帰する", () => {
    const { rerender } = render(<Page interview={false} />);
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "主要ナビゲーション" })
    ).toBeVisible();

    rerender(<Page interview />);
    expectChromeAbsent();
    expect(screen.getByRole("main").parentElement).not.toHaveClass(
      "layout-with-mobile-primary-navigation"
    );
    expect(screen.getByRole("main").parentElement).toHaveClass(
      "[&>main]:min-h-0"
    );

    rerender(<Page interview={false} />);
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "主要ナビゲーション" })
    ).toBeVisible();
    expect(screen.getByRole("main").parentElement).toHaveClass(
      "layout-with-mobile-primary-navigation"
    );
    expect(screen.getByRole("main").parentElement).not.toHaveClass(
      "[&>main]:min-h-0"
    );
  });

  it("入力フォーカス・キーボード開閉を繰り返してもナビを再表示しない", () => {
    const { rerender } = render(<Page interview />);
    const input = screen.getByRole("textbox");
    for (let cycle = 0; cycle < 3; cycle++) {
      act(() => input.focus());
      browser.frame.keyboardInset = 300;
      rerender(<Page interview />);
      expectChromeAbsent();

      act(() => input.blur());
      browser.frame.keyboardInset = 0;
      rerender(<Page interview />);
      expectChromeAbsent();
    }
  });

  it("下部ナビ自体が再マウントされてもインタビュー中はDOMを作らない", () => {
    const { rerender } = render(<Page interview />);
    act(() => screen.getByRole("textbox").focus());
    rerender(<Page interview navigationKey={1} />);
    act(() => screen.getByRole("textbox").blur());
    rerender(<Page interview navigationKey={2} />);
    expectChromeAbsent();
  });

  it("通常画面では従来どおりキーボードを閉じるとナビを戻す", () => {
    render(<Page interview={false} />);
    const input = screen.getByRole("textbox");
    act(() => input.focus());
    expect(
      screen.queryByRole("navigation", { name: "主要ナビゲーション" })
    ).not.toBeInTheDocument();
    act(() => input.blur());
    expect(
      screen.getByRole("navigation", { name: "主要ナビゲーション" })
    ).toBeVisible();
  });

  it("別ページへ遷移した後はフッターとナビを隠さない", () => {
    const { rerender } = render(<Page interview />);
    browser.pathname = "/bills";
    rerender(<Page interview={false} />);
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "主要ナビゲーション" })
    ).toBeVisible();
  });
});
