// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCommentMinpakuPage } from "./public-comment-page";

vi.mock("@/features/chat/client/hooks/use-anonymous-supabase-user", () => ({
  useAnonymousSupabaseUser: () => "anonymous-user",
}));

describe("PublicCommentMinpakuPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("保存同意前は開始できず、同意後にだけセッション開始APIを呼ぶ", async () => {
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
    const startButton = screen.getByRole("button", {
      name: "インタビューを始める",
    });
    expect(startButton).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(startButton).toBeEnabled();
    fireEvent.click(startButton);

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
