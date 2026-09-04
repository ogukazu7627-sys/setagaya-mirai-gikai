// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  useChatAuth: vi.fn(),
}));

vi.mock("@/features/chat/client/hooks/use-chat-auth", () => ({
  useChatAuth: mocks.useChatAuth,
}));

vi.mock("./interview-side-panel", () => ({
  InterviewSidePanel: (props: {
    authStatus: string;
    billId: string;
    isActive: boolean;
    layout: string;
  }) => (
    <div>
      {props.billId}:{props.authStatus}:{props.layout}:{String(props.isActive)}
    </div>
  ),
}));

import { InterviewChatPageClient } from "./interview-chat-page-client";

describe("InterviewChatPageClient", () => {
  it("全画面でも共通認証状態をpageレイアウトの初期化処理へ渡す", () => {
    mocks.useChatAuth.mockReturnValue({
      status: "unauthenticated",
      error: undefined,
      signInWithGoogle: mocks.signInWithGoogle,
    });

    render(<InterviewChatPageClient billId="bill-1" />);

    expect(
      screen.getByText("bill-1:unauthenticated:page:true")
    ).toBeInTheDocument();
  });
});
