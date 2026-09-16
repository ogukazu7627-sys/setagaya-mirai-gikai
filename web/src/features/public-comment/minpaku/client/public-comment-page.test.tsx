// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MINPAKU_LESSONS } from "../shared/learning";
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
  afterEach(cleanup);
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
      name: "すぐにAIインタビューをはじめる",
    })[0];
    expect(startButton).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(startButton);
    const consentCheckbox = await screen.findByRole("checkbox");
    expect(
      screen.getByRole("button", { name: "同意してはじめる" })
    ).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("不正解も解説後に進め、4章の学習後も保存同意までAPIを呼ばない", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: "session-1",
          messages: [
            { id: "first", role: "assistant", content: "最初の質問です" },
          ],
        }),
        { status: 200 }
      )
    );
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "条例改正について学ぶ" })[0]
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "なぜ見直すのか" })
    ).toHaveFocus();
    expect(screen.getByRole("button", { name: "回答を確認" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "次の章へ" })
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", {
        name: "すべての施設に違法行為があると確認されたため",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "回答を確認" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "解説を確認しましょう"
    );
    expect(
      screen.getByRole("heading", { name: "解説を確認しましょう" })
    ).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "次の章へ" }));
    fireEvent.click(screen.getByRole("button", { name: "前の章へ" }));
    expect(
      screen.getByRole("radio", {
        name: "すべての施設に違法行為があると確認されたため",
      })
    ).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("正解：");
    expect(
      screen.getByRole("heading", { level: 1, name: "なぜ見直すのか" })
    ).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "次の章へ" }));
    for (const lesson of MINPAKU_LESSONS.slice(1)) {
      fireEvent.click(
        screen.getByRole("radio", {
          name: lesson.quiz.options[lesson.quiz.correctIndex],
        })
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "回答を確認" }));
      expect(screen.getByRole("status")).toHaveTextContent("正解です");
      expect(screen.getByRole("status")).toHaveTextContent(
        lesson.quiz.explanation
      );
      expect(screen.getByRole("status")).toHaveTextContent("資料確認日");
      if (lesson.id !== "position")
        fireEvent.click(screen.getByRole("button", { name: "次の章へ" }));
    }
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "AIインタビューをはじめる",
      })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));
    expect(await screen.findByText("最初の質問です")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/minpaku/session",
      expect.objectContaining({ body: JSON.stringify({ consented: true }) })
    );
  });

  it("途中から同意画面へ進め、キャンセルすると学習中の回答を保持する", () => {
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "条例改正について学ぶ" })[0]
    );
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByRole("button", { name: "回答を確認" }));
    fireEvent.click(screen.getByRole("button", { name: "次の章へ" }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "回答を確認" }));
    fireEvent.click(
      screen.getByRole("button", { name: "学習を途中で終えてインタビューへ" })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "同意せずに戻る" }));
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
    expect(
      screen.getByRole("heading", { name: "何のルールを変えるのか" })
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("正解です");
    fireEvent.click(
      screen.getByRole("button", { name: "学習を途中で終えてインタビューへ" })
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "同意してはじめる" })
    ).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "条例改正について学ぶ" })[0]
    );
    expect(
      screen
        .getAllByRole("radio")
        .every((radio) => !(radio as HTMLInputElement).checked)
    ).toBe(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "なぜ見直すのか" })
    ).toBeInTheDocument();
  });

  it("キーボードで選択・回答確認・次章への移動ができる", async () => {
    const user = userEvent.setup();
    render(<PublicCommentMinpakuPage />);
    await user.click(
      screen.getAllByRole("button", { name: "条例改正について学ぶ" })[0]
    );
    for (let step = 0; step < 15; step++) {
      await user.tab();
      if (document.activeElement === screen.getAllByRole("radio")[0]) break;
    }
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
    await user.tab();
    expect(screen.getByRole("button", { name: "回答を確認" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "解説を確認しましょう" })
    ).toHaveFocus();
    for (let step = 0; step < 10; step++) {
      await user.tab();
      if (
        document.activeElement ===
        screen.getByRole("button", { name: "次の章へ" })
      )
        break;
    }
    expect(screen.getByRole("button", { name: "次の章へ" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "何のルールを変えるのか" })
    ).toHaveFocus();
  });

  it("学習から案内画面に戻って直接開始の導線を選べる", () => {
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "条例改正について学ぶ" })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "案内画面に戻る" }));
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "すぐにAIインタビューをはじめる",
      })[0]
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
