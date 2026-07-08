// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { act, createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "@/features/bills/shared/types";
import { ChatButton, type ChatButtonRef } from "./chat-button";

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  sendMessage: vi.fn(),
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
  ChatWindow: () => null,
}));

describe("ChatButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
