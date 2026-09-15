// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCommentMinpakuPage } from "./public-comment-page";

vi.mock("@/features/chat/client/hooks/use-anonymous-supabase-user", () => ({
  useAnonymousSupabaseUser: () => "anonymous-user",
}));

vi.mock("./public-comment-interview-chat", () => ({
  PublicCommentInterviewChat: ({
    messages,
  }: {
    messages: Array<{ content: string }>;
  }) => (
    <div>
      {messages.map((message) => (
        <p key={message.content}>{message.content}</p>
      ))}
    </div>
  ),
}));

describe("PublicCommentMinpakuPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("同意モーダルで保存に同意した後にだけセッション開始APIを呼ぶ", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: "session-1",
          messages: [
            {
              id: "message-1",
              role: "assistant",
              content: "このテーマに、あなたはどのような関わりがありますか？",
            },
          ],
          quickReplies: ["近隣で暮らしている"],
        }),
        { status: 200 }
      )
    );

    render(<PublicCommentMinpakuPage />);
    const startButton = screen.getAllByRole("button", {
      name: "AIインタビューをはじめる",
    })[0];
    expect(startButton).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(startButton);
    const consentCheckbox = await screen.findByRole("checkbox");
    fireEvent.click(consentCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/public-comment/minpaku/session",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(
      await screen.findByText(
        "このテーマに、あなたはどのような関わりがありますか？"
      )
    ).toBeInTheDocument();
  });
});
