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
import { Button } from "@/components/ui/button";
import {
  PUBLIC_COMMENT_AUTH_RECEIPT_KEY,
  PUBLIC_COMMENT_AUTH_RETURN_KEY,
  PUBLIC_COMMENT_CONSENT_VERSION,
} from "../shared/consent";
import { MINPAKU_LESSONS } from "../shared/learning";
import { PublicCommentMinpakuPage } from "./public-comment-page";

const auth = vi.hoisted(() => ({
  status: "authenticated",
  userEmail: "user@example.com",
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/chat/client/hooks/use-chat-auth", () => ({
  useChatAuth: () => auth,
}));

vi.mock("./public-comment-interview-chat", () => ({
  PublicCommentInterviewChat: ({
    messages,
    onQuickReply,
  }: {
    messages: Array<{ content: string }>;
    onQuickReply: (value: string) => void;
  }) => (
    <div>
      {messages.map((message) => (
        <p key={message.content}>{message.content}</p>
      ))}
      <Button onClick={() => onQuickReply("私の経験です")}>回答する</Button>
    </div>
  ),
}));

describe("PublicCommentMinpakuPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    auth.status = "authenticated";
    auth.signInWithGoogle.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/public-comment/minpaku");
  });

  it("テーマ別の中央見出しとインタビュー優先の開始導線を表示する", () => {
    render(<PublicCommentMinpakuPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /AIパブコメインタビュー.*民泊・旅館業の条例改正素案/,
      })
    ).toHaveClass("text-center");
    expect(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    ).toHaveClass("bg-mirai-gradient");
    expect(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    ).toHaveClass("underline");
  });

  it("Googleログインをキャンセルして戻った場合も同意画面で再試行できる", async () => {
    auth.status = "unauthenticated";
    window.history.replaceState(
      null,
      "",
      "/public-comment/minpaku?auth_error=google_login_failed"
    );
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Googleログインが完了しませんでした"
    );
    expect(window.location.search).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() => expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it.each([
    "0",
    "1",
  ])("別ブラウザでStorageがなくても同意画面と控え設定を復元: %s", (receipt) => {
    window.history.replaceState(
      null,
      "",
      `/public-comment/minpaku?auth_return=1&receipt=${receipt}&share=test`
    );
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /回答の保存に同意/ })
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).toHaveProperty("checked", receipt === "1");
    expect(window.location.search).toBe("?share=test");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("戻り先URLの設定は古いStorageより優先し、Storageを片付ける", () => {
    sessionStorage.setItem(PUBLIC_COMMENT_AUTH_RETURN_KEY, "1");
    sessionStorage.setItem(PUBLIC_COMMENT_AUTH_RECEIPT_KEY, "false");
    window.history.replaceState(
      null,
      "",
      "/public-comment/minpaku?auth_return=1&receipt=1"
    );
    render(<PublicCommentMinpakuPage />);
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).toBeChecked();
    expect(sessionStorage.getItem(PUBLIC_COMMENT_AUTH_RETURN_KEY)).toBeNull();
    expect(sessionStorage.getItem(PUBLIC_COMMENT_AUTH_RECEIPT_KEY)).toBeNull();
  });

  it("別ブラウザで認証失敗してもメール未選択のまま再試行する", async () => {
    auth.status = "unauthenticated";
    window.history.replaceState(
      null,
      "",
      "/public-comment/minpaku?auth_return=1&receipt=0&auth_error=google_login_failed"
    );
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Googleログインが完了しませんでした"
    );
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith(
        "/public-comment/minpaku?auth_return=1&receipt=0"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ログイン前は同意だけで開始できず、Googleログインから同意画面へ戻る", async () => {
    auth.status = "unauthenticated";
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    expect(
      screen.getByRole("button", { name: "同意してはじめる" })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() => expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(PUBLIC_COMMENT_AUTH_RETURN_KEY)).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();
    auth.status = "authenticated";
    render(<PublicCommentMinpakuPage />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /回答の保存に同意/ })
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PUBLIC_COMMENT_AUTH_RETURN_KEY)).toBeNull();
  });

  it("控えメールは初期チェック済みで、保存への同意は別に必要", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: "session-1",
          messages: [],
        })
      )
    );
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).toBeChecked();
    expect(screen.getByText("送信先：user@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "同意してはじめる" })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/public-comment/minpaku/session",
        expect.objectContaining({
          body: JSON.stringify({
            consented: true,
            receiptOptIn: true,
            consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
          }),
        })
      )
    );
  });

  it("Googleログイン前に外した控えのチェックを、ログインから戻った後も保持する", async () => {
    auth.status = "unauthenticated";
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "Google でログイン" }));
    await waitFor(() => expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(PUBLIC_COMMENT_AUTH_RECEIPT_KEY)).toBe(
      "false"
    );
    expect(auth.signInWithGoogle).toHaveBeenCalledWith(
      "/public-comment/minpaku?auth_return=1&receipt=0"
    );
    cleanup();
    auth.status = "authenticated";
    render(<PublicCommentMinpakuPage />);
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /回答の保存に同意/ })
    ).not.toBeChecked();
    expect(sessionStorage.getItem(PUBLIC_COMMENT_AUTH_RECEIPT_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("控えのチェックを外してもインタビューを開始できる", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ sessionId: "session-1", messages: [] }))
      );
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    );
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        "/api/public-comment/minpaku/session",
        expect.objectContaining({
          body: JSON.stringify({
            consented: true,
            receiptOptIn: false,
            consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
          }),
        })
      )
    );
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
      name: "AIパブコメインタビューをはじめる",
    })[0];
    expect(startButton).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(startButton);
    const consentCheckbox = await screen.findByRole("checkbox", {
      name: /回答の保存に同意/,
    });
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

  it("不正解も解説後に進め、6章の学習後も保存同意までAPIを呼ばない", async () => {
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
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "なぜ、2つの条例を一緒に見直すの？",
      })
    ).toHaveFocus();
    expect(screen.getByRole("button", { name: "回答を確認" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "次の章へ" })
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", {
        name: "住宅宿泊事業だけ",
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
        name: "住宅宿泊事業だけ",
      })
    ).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("正解：");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "なぜ、2つの条例を一緒に見直すの？",
      })
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
      if (lesson !== MINPAKU_LESSONS.at(-1))
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
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));
    expect(await screen.findByText("最初の質問です")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/minpaku/session",
      expect.objectContaining({
        body: JSON.stringify({
          consented: true,
          receiptOptIn: true,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      })
    );
  });

  it("途中から同意画面へ進め、キャンセルすると学習中の回答を保持する", () => {
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
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
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意せずに戻る" }));
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
    expect(
      screen.getByRole("heading", {
        name: "騒音やごみのトラブルに、どう備えるの？",
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("正解です");
    fireEvent.click(
      screen.getByRole("button", { name: "学習を途中で終えてインタビューへ" })
    );
    expect(
      screen.getByRole("checkbox", { name: /回答の保存に同意/ })
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "同意してはじめる" })
    ).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    expect(
      screen
        .getAllByRole("radio")
        .every((radio) => !(radio as HTMLInputElement).checked)
    ).toBe(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "なぜ、2つの条例を一緒に見直すの？",
      })
    ).toBeInTheDocument();
  });

  it("キーボードで選択・回答確認・次章への移動ができる", async () => {
    const user = userEvent.setup();
    render(<PublicCommentMinpakuPage />);
    await user.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
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
      screen.getByRole("heading", {
        name: "騒音やごみのトラブルに、どう備えるの？",
      })
    ).toHaveFocus();
  });

  it("学習から案内画面に戻って直接開始の導線を選べる", () => {
    const fetchMock = vi.spyOn(global, "fetch");
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "学習してからはじめる" })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: "案内画面に戻る" }));
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  async function reachReview() {
    const draft = {
      id: "draft-1",
      ai_body: "AIの下書き",
      final_body: "AIの下書き",
      target_ordinances: ["条例"],
      fact_check_notes: [],
    };
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (url, init) => {
        if (String(url).endsWith("/session"))
          return Response.json({ sessionId: "session-1", messages: [] });
        if (String(url).endsWith("/chat"))
          return Response.json({
            message: {
              id: "last",
              role: "assistant",
              content: "聞き取りが終わりました",
            },
            nextStage: "draft",
          });
        if (init?.method === "PATCH") {
          const { finalBody } = JSON.parse(String(init.body));
          return Response.json({ draft: { ...draft, final_body: finalBody } });
        }
        if (String(url).endsWith("/draft")) return Response.json({ draft });
        if (String(url).endsWith("/complete"))
          return Response.json({
            status: "private",
            receipt: { status: "failed", canRetry: true },
          });
        if (String(url).endsWith("/receipt"))
          return Response.json({
            receipt: { status: "accepted", canRetry: false },
          });
        throw new Error("Unexpected test request");
      });
    render(<PublicCommentMinpakuPage />);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "AIパブコメインタビューをはじめる",
      })[0]
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /回答の保存に同意/ }));
    fireEvent.click(screen.getByRole("button", { name: "同意してはじめる" }));
    fireEvent.click(await screen.findByRole("button", { name: "回答する" }));
    const heading = await screen.findByRole("heading", {
      name: "どの条例について意見を書きますか？",
    });
    expect(heading).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "下書きを作る" }));
    await screen.findByRole("textbox", { name: "提出用に編集する本文" });
    return fetchMock;
  }

  it("完了前までメールを送らず、最終編集と受信設定を確定してから送信する", async () => {
    const fetchMock = await reachReview();
    expect(
      screen.getByRole("heading", {
        name: "あなたの言葉になっているか確認してください",
      })
    ).toHaveFocus();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith("/complete"))
    ).toBe(false);
    fireEvent.change(
      screen.getByRole("textbox", { name: "提出用に編集する本文" }),
      { target: { value: "私が確認した最終コメント" } }
    );
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).toBeChecked();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "確認して完了" }));
    await screen.findByRole("heading", { name: "下書きを保存しました" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-comment/minpaku/complete",
      expect.objectContaining({
        body: JSON.stringify({
          sessionId: "session-1",
          publicationRequested: false,
          receiptOptIn: false,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      })
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH"
    );
    expect(JSON.parse(String(patch?.[1]?.body)).finalBody).toBe(
      "私が確認した最終コメント"
    );
    expect(
      screen.getByRole("heading", { name: "下書きを保存しました" })
    ).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  });

  it("メールに失敗しても完了画面を表示し、再試行はメール専用APIだけを呼ぶ", async () => {
    const fetchMock = await reachReview();
    fireEvent.click(screen.getByRole("button", { name: "確認して完了" }));
    const retry = await screen.findByRole("button", {
      name: "控えメールの送信を再試行",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "下書きは保存されています"
    );
    fetchMock.mockClear();
    fireEvent.click(retry);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "送信を受け付けました"
      )
    );
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "/api/public-comment/minpaku/receipt",
      expect.objectContaining({
        body: JSON.stringify({ sessionId: "session-1" }),
      })
    );
    expect(
      screen.queryByRole("button", { name: "控えメールの送信を再試行" })
    ).not.toBeInTheDocument();
  });

  it("完了応答が失われても内容を固定し、同じ完了処理だけを再確認する", async () => {
    const fetchMock = await reachReview();
    const original = fetchMock.getMockImplementation();
    if (!original) throw new Error("Test fetch implementation is missing");
    let completions = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).endsWith("/complete")) {
        completions++;
        if (completions === 1) throw new TypeError("Connection lost");
        return Response.json({
          status: "private",
          receipt: { status: "accepted", canRetry: false },
        });
      }
      return original(url, init);
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /匿名で公開/ }));
    fireEvent.click(screen.getByRole("button", { name: "確認して完了" }));
    await screen.findByRole("alert");
    expect(
      screen.getByRole("textbox", { name: "提出用に編集する本文" })
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /控えをメールで受け取る/ })
    ).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /匿名で公開/ })).toBeDisabled();
    fetchMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "確認して完了" }));
    await screen.findByRole("heading", { name: "下書きを保存しました" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/public-comment/minpaku/complete"
    );
    expect(
      screen.queryByText(/匿名公開の申請は運営確認待ち/)
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "送信を受け付けました"
    );
  });
});
