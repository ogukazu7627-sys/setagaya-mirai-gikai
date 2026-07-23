// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { act, createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "@/features/bills/shared/types";
import { ChatButton, type ChatButtonRef } from "./chat-button";

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  sendMessage: vi.fn(),
  chatWindowProps: undefined as
    | {
        isOpen: boolean;
      }
    | undefined,
  usePathname: vi.fn(() => "/bills/bill-1"),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: mocks.sendMessage,
    status: "ready",
    error: undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.usePathname(),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("../hooks/use-chat-auth", () => ({
  useChatAuth: () => ({
    status: "authenticated",
    userEmail: "test@example.com",
    error: undefined,
    signInWithGoogle: mocks.signInWithGoogle,
  }),
}));

vi.mock("./chat-window", () => ({
  ChatWindow: (props: { isOpen: boolean }) => {
    mocks.chatWindowProps = props;
    return props.isOpen ? (
      <div aria-label="AIに質問する" role="dialog" />
    ) : null;
  },
}));

describe("ChatButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chatWindowProps = undefined;
  });

  it("ランチャーは1回目のタップでキーボードではなくダイアログだけを開くbuttonである", () => {
    render(<ChatButton difficultyLevel="normal" />);

    const launcher = screen.getByRole("button", {
      name: "案件について質問する",
    });

    expect(launcher).toHaveAttribute("type", "button");
    expect(launcher).toHaveAttribute("aria-haspopup", "dialog");
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(launcher);

    expect(launcher).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "AIに質問する" })).toBeVisible();
    expect(mocks.chatWindowProps?.isOpen).toBe(true);
  });

  it("選択テキストから開いた質問でも通常質問と同じ案件コンテキストを送信する", () => {
    const ref = createRef<ChatButtonRef>();
    const billContext = {
      id: "bill-1",
      name: "テスト案件",
      tags: [],
    } as unknown as BillWithContent;
    const pageContext = { type: "bill" as const };

    render(
      <ChatButton
        ref={ref}
        billContext={billContext}
        hasInterviewConfig={true}
        difficultyLevel="hard"
        pageContext={pageContext}
      />
    );

    act(() => {
      ref.current?.openWithText("選択した本文");
    });

    expect(mocks.sendMessage).toHaveBeenCalledWith({
      text: "「選択した本文」について教えてください。",
      metadata: {
        billContext,
        hasInterviewConfig: true,
        difficultyLevel: "hard",
        pageContext,
        sessionId: expect.any(String),
      },
    });
  });
});
