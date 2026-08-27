// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CouncilQuestionAiChatProvider } from "@/features/bills/client/components/question-collection/council-question-ai-chat";
import type { ChatBillContext } from "@/features/chat/shared/types/page-context";
import { BudgetQuestionAiChatProvider } from "./budget-question-ai-chat";

vi.mock("@/features/chat/client/components/chat-button", () => ({
  ChatButton: (props: {
    billContext?: ChatBillContext;
    hasInterviewConfig?: boolean;
    pageContext?: { type: string };
    showLauncher?: boolean;
  }) => (
    <div
      data-bill-id={props.billContext?.id}
      data-has-interview={String(props.hasInterviewConfig)}
      data-page-type={props.pageContext?.type}
      data-show-launcher={String(props.showLauncher)}
      data-testid="mock-chat-button"
    />
  ),
}));

describe("BudgetQuestionAiChatProvider", () => {
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
  });

  it("対象質問がない場合はAI欄を表示しない", () => {
    render(
      <BudgetQuestionAiChatProvider difficultyLevel="normal">
        <p>空状態</p>
      </BudgetQuestionAiChatProvider>
    );

    expect(screen.queryByTestId("mock-chat-button")).not.toBeInTheDocument();
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
  });
});
