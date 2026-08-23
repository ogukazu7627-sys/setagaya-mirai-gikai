// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatBillContext } from "@/features/chat/shared/types/page-context";
import {
  BudgetQuestionAiAskButton,
  BudgetQuestionAiChatProvider,
} from "./budget-question-ai-chat";

const chatMocks = vi.hoisted(() => ({
  open: vi.fn(),
}));

vi.mock("@/features/chat/client/components/chat-button", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");

  return {
    ChatButton: forwardRef<
      { open: () => void },
      {
        billContext?: ChatBillContext;
        hasInterviewConfig?: boolean;
        pageContext?: { type: string };
        showLauncher?: boolean;
      }
    >(function MockChatButton(props, ref) {
      useImperativeHandle(ref, () => ({ open: chatMocks.open }));

      return (
        <div
          data-bill-id={props.billContext?.id}
          data-has-interview={String(props.hasInterviewConfig)}
          data-page-type={props.pageContext?.type}
          data-show-launcher={String(props.showLauncher)}
          data-testid="mock-chat-button"
        />
      );
    }),
  };
});

describe("BudgetQuestionAiChatProvider", () => {
  beforeEach(() => {
    chatMocks.open.mockReset();
  });

  it("押した予算質問だけを対象にAI質問を開き、インタビューを無効にする", async () => {
    render(
      <BudgetQuestionAiChatProvider difficultyLevel="normal">
        <BudgetQuestionAiAskButton
          questionId="question-a"
          questionName="学校改修について"
        />
      </BudgetQuestionAiChatProvider>
    );

    expect(screen.queryByTestId("mock-chat-button")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "「学校改修について」についてAIに聞く",
      })
    );

    const chatButton = await screen.findByTestId("mock-chat-button");
    expect(chatButton).toHaveAttribute("data-bill-id", "question-a");
    expect(chatButton).toHaveAttribute("data-page-type", "budget-question");
    expect(chatButton).toHaveAttribute("data-has-interview", "false");
    expect(chatButton).toHaveAttribute("data-show-launcher", "false");
    await waitFor(() => expect(chatMocks.open).toHaveBeenCalledTimes(1));
  });

  it("別の質問を押すとチャット対象をその質問へ切り替える", async () => {
    render(
      <BudgetQuestionAiChatProvider difficultyLevel="hard">
        <BudgetQuestionAiAskButton
          questionId="question-a"
          questionName="学校改修について"
        />
        <BudgetQuestionAiAskButton
          questionId="question-b"
          questionName="給食について"
        />
      </BudgetQuestionAiChatProvider>
    );

    const buttons = screen.getAllByRole("button", {
      name: /についてAIに聞く/,
    });
    fireEvent.click(buttons[0]);
    expect(await screen.findByTestId("mock-chat-button")).toHaveAttribute(
      "data-bill-id",
      "question-a"
    );

    fireEvent.click(buttons[1]);
    await waitFor(() =>
      expect(screen.getByTestId("mock-chat-button")).toHaveAttribute(
        "data-bill-id",
        "question-b"
      )
    );
    expect(chatMocks.open).toHaveBeenCalledTimes(2);
  });
});
