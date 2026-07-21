// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterviewSidePanel } from "./interview-side-panel";

vi.mock("./interview-chat-client", () => ({
  InterviewChatClient: ({
    initialMessages,
    isPreparingInitialQuestion,
  }: {
    initialMessages: Array<{ content: string }>;
    isPreparingInitialQuestion?: boolean;
  }) => (
    <div>
      <p>初期化完了:</p>
      <p>{initialMessages[0]?.content ?? "メッセージなし"}</p>
      <p>{`準備中:${String(isPreparingInitialQuestion)}`}</p>
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/interview/initialize",
      expect.objectContaining({
        body: JSON.stringify({
          billId: "bill-1",
          deferInitialQuestion: true,
        }),
      })
    );
  });

  it("初回質問が未生成でもパネルを先に表示し、裏側で最初の質問を取得する", async () => {
    let resolveSecondRequest: (value: unknown) => void = () => {};
    const secondRequest = new Promise((resolve) => {
      resolveSecondRequest = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: {
            id: "session-1",
            started_at: "2026-07-19T01:00:00.000Z",
            rating: null,
          },
          messages: [],
          mode: "loop",
          totalQuestions: 4,
          estimatedDuration: 5,
          sessionStartedAt: "2026-07-19T01:00:00.000Z",
          hasRated: false,
          billTitle: "テスト案件",
        }),
      })
      .mockReturnValueOnce(secondRequest);
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
    expect(screen.getByText("メッセージなし")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("準備中:true")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/interview/initialize",
      expect.objectContaining({
        body: JSON.stringify({
          billId: "bill-1",
          deferInitialQuestion: true,
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/interview/initialize",
      expect.objectContaining({
        body: JSON.stringify({
          billId: "bill-1",
          deferInitialQuestion: false,
        }),
      })
    );

    resolveSecondRequest({
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

    await waitFor(() => {
      expect(screen.getByText("最初の質問です")).toBeInTheDocument();
    });
    expect(screen.getByText("準備中:false")).toBeInTheDocument();
  });
});
