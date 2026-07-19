// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterviewSidePanel } from "./interview-side-panel";

vi.mock("./interview-chat-client", () => ({
  InterviewChatClient: ({
    initialMessages,
  }: {
    initialMessages: Array<{ content: string }>;
  }) => (
    <div>
      <p>初期化完了:</p>
      <p>{initialMessages[0]?.content}</p>
    </div>
  ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InterviewSidePanel", () => {
  it("初期化開始時の再レンダーで通信結果をキャンセルせず、取得した初回メッセージを表示する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          id: "session-1",
          started_at: "2026-07-19T01:00:00.000Z",
          rating: null,
        },
        messages: [
          {
            id: "message-1",
            role: "assistant",
            content: "最初の質問です",
            created_at: "2026-07-19T01:00:01.000Z",
          },
        ],
        mode: "loop",
        totalQuestions: 4,
        estimatedDuration: 5,
        sessionStartedAt: "2026-07-19T01:00:00.000Z",
        hasRated: false,
        billTitle: "テスト案件",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <InterviewSidePanel
        authStatus="authenticated"
        billId="bill-1"
        isActive
        onSignInWithGoogle={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("初期化完了:")).toBeInTheDocument();
    });
    expect(screen.getByText("最初の質問です")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
