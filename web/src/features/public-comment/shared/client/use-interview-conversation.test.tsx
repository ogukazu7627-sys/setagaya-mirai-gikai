// @vitest-environment jsdom
import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInterviewConversation } from "./use-interview-conversation";

const progress = {
  percentage: 5,
  currentTopic: "最初のテーマ",
  remainingQuestionRange: { min: 20, max: 20 },
  paused: false,
};
const snapshot = {
  messages: [
    { id: "a1", role: "assistant" as const, content: "固定前提と問い" },
  ],
  revision: 1,
  quickReplies: [],
  progress,
  mode: "loop" as const,
};
const next = {
  message: { id: "a2", role: "assistant", content: "深掘り" },
  revision: 2,
  quickReplies: [],
  progress,
  mode: "loop",
  nextStage: "interview",
  userMessageStored: true,
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function setup() {
  const setError = vi.fn();
  const onDone = vi.fn();
  const hook = renderHook(() =>
    useInterviewConversation({
      sessionId: "s1",
      apiBasePath: "/api/test",
      busy: false,
      setBusy: vi.fn(),
      setError,
      onDone,
    })
  );
  act(() => hook.result.current.loadConversation(snapshot));
  return { ...hook, setError, onDone };
}
describe("インタビュー送信と画面状態", () => {
  it("通信断の再送は同じrequestId/revisionを使い、二重表示せずサーバーの進行を採用する", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(Response.json(next));
    const { result } = setup();
    await act(() => result.current.sendAnswer("最初の回答"));
    expect(result.current.answer).toBe("最初の回答");
    expect(result.current.messages).toHaveLength(1);
    await act(() => result.current.sendAnswer("最初の回答"));
    const bodies = fetch.mock.calls.map(([, input]) =>
      JSON.parse(input?.body as string)
    );
    expect(bodies[1]).toEqual(bodies[0]);
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.progress).toEqual(progress);
    expect(result.current.progress.currentTopic).toBe("最初のテーマ");
  });
  it("未確認の送信がある間は別内容・別操作を送らない", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new TypeError("network"));
    const { result, setError } = setup();
    await act(() => result.current.sendAnswer("回答"));
    await act(() => result.current.sendAnswer("", "skip"));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenLastCalledWith(
      expect.stringContaining("同じ内容で再送")
    );
  });
  it("連打を一つの送信に制限する", async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done;
      })
    );
    const { result } = setup();
    let first!: Promise<void>;
    act(() => {
      first = result.current.sendAnswer("回答");
      void result.current.sendAnswer("回答");
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(Response.json(next));
      await first;
    });
  });
  it("安全案内で保存されなかった発言は表示からも外す", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        ...next,
        userMessageStored: false,
        progress: { ...progress, paused: true },
      })
    );
    const { result } = setup();
    await act(() => result.current.sendAnswer("個人的な切迫した訴え"));
    expect(result.current.messages.map((m) => m.content)).not.toContain(
      "個人的な切迫した訴え"
    );
    expect(result.current.progress.paused).toBe(true);
  });
  it("スキップ・終了は架空のユーザー回答を追加しない", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({ ...next, userMessageStored: false })
      )
      .mockResolvedValueOnce(
        Response.json({
          ...next,
          revision: 3,
          nextStage: "draft",
          userMessageStored: false,
        })
      );
    const { result, onDone } = setup();
    await act(() => result.current.sendAnswer("", "skip"));
    await act(() => result.current.sendAnswer("", "finish"));
    expect(result.current.messages.every((m) => m.role === "assistant")).toBe(
      true
    );
    expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toMatchObject({
      action: "finish",
      revision: 2,
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
