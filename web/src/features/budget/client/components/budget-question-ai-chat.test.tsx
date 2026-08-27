// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CouncilQuestionAiChatProvider } from "@/features/bills/client/components/question-collection/council-question-ai-chat";
import type { ChatButtonRef } from "@/features/chat/client/components/chat-button";
import type { ChatBillContext } from "@/features/chat/shared/types/page-context";
import { BudgetQuestionAiChatProvider } from "./budget-question-ai-chat";

const mocks = vi.hoisted(() => ({
  openWithText: vi.fn(),
}));

vi.mock(
  "@/features/bills/client/components/text-selection-tooltip/text-selection-wrapper",
  () => ({
    TextSelectionWrapper: ({
      children,
      onOpenChat,
    }: {
      children: ReactNode;
      onOpenChat?: (selectedText: string) => void;
    }) => (
      <div data-testid="mock-text-selection-wrapper">
        {children}
        <button onClick={() => onOpenChat?.("選択した本文")} type="button">
          選択範囲をAIに質問
        </button>
      </div>
    ),
  })
);

vi.mock("@/features/chat/client/components/chat-button", async () => {
  const { forwardRef, useImperativeHandle } =
    await vi.importActual<typeof import("react")>("react");
  const ChatButton = forwardRef<
    ChatButtonRef,
    {
      billContext?: ChatBillContext;
      hasInterviewConfig?: boolean;
      pageContext?: { type: string };
      showLauncher?: boolean;
    }
  >((props, ref) => {
    useImperativeHandle(ref, () => ({
      open: vi.fn(),
      openWithText: mocks.openWithText,
    }));

    return (
      <div
        data-bill-id={props.billContext?.id}
        data-has-interview={String(props.hasInterviewConfig)}
        data-page-type={props.pageContext?.type}
        data-show-launcher={String(props.showLauncher)}
        data-testid="mock-chat-button"
      />
    );
  });
  ChatButton.displayName = "MockChatButton";

  return { ChatButton };
});

describe("BudgetQuestionAiChatProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("選択中の予算質問を対象に常設AI欄を表示する", () => {
    render(
      <BudgetQuestionAiChatProvider
        defaultQuestion={{ id: "budget-a", name: "学校改修について" }}
        difficultyLevel="normal"
      >
        <p>質問本文</p>
      </BudgetQuestionAiChatProvider>
    );

    const chatButton = screen.getByTestId("mock-chat-button");
    expect(chatButton).toHaveAttribute("data-bill-id", "budget-a");
    expect(chatButton).toHaveAttribute("data-page-type", "budget-question");
    expect(chatButton).toHaveAttribute("data-has-interview", "false");
    expect(chatButton).toHaveAttribute("data-show-launcher", "true");
    expect(
      screen.queryByText("この質問についてAIに聞く")
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("わからない言葉を")).toHaveLength(1);
  });

  it("選択した文章を既存のAI質問欄へ渡す", () => {
    render(
      <BudgetQuestionAiChatProvider
        defaultQuestion={{ id: "budget-a", name: "学校改修について" }}
        difficultyLevel="normal"
      >
        <p>質問本文</p>
      </BudgetQuestionAiChatProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "選択範囲をAIに質問" }));

    expect(mocks.openWithText).toHaveBeenCalledWith("選択した本文");
  });

  it("対象質問がない場合はAI欄を表示しない", () => {
    render(
      <BudgetQuestionAiChatProvider difficultyLevel="normal">
        <p>空状態</p>
      </BudgetQuestionAiChatProvider>
    );

    expect(screen.queryByTestId("mock-chat-button")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-text-selection-wrapper")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("わからない言葉を")).not.toBeInTheDocument();
  });

  it("一般質問でも選択中の質問を対象に常設AI欄を表示する", () => {
    render(
      <CouncilQuestionAiChatProvider
        defaultQuestion={{ id: "general-a", name: "若者支援について" }}
        difficultyLevel="hard"
        kind="general"
      >
        <p>一般質問本文</p>
      </CouncilQuestionAiChatProvider>
    );

    const chatButton = screen.getByTestId("mock-chat-button");
    expect(chatButton).toHaveAttribute("data-bill-id", "general-a");
    expect(chatButton).toHaveAttribute("data-page-type", "general-question");
    expect(chatButton).toHaveAttribute("data-show-launcher", "true");
    expect(screen.getAllByText("わからない言葉を")).toHaveLength(1);
  });
});
