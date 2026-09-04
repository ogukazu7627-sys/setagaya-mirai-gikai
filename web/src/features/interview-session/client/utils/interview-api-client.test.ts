import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callCompleteApi,
  callInitializeInterviewApi,
  callRecipientCandidatesApi,
  callUpdatePublicSettingApi,
} from "./interview-api-client";

describe("callInitializeInterviewApi", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("初回質問の遅延指定を初期化APIへ渡す", async () => {
    const response = {
      session: {
        id: "session-1",
        started_at: "2026-09-04T00:00:00.000Z",
        rating: null,
      },
      messages: [],
      mode: "loop",
      totalQuestions: 4,
      estimatedDuration: 5,
      sessionStartedAt: "2026-09-04T00:00:00.000Z",
      hasRated: false,
      billTitle: "テスト案件",
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 })
    );

    await expect(
      callInitializeInterviewApi({
        billId: "bill-1",
        deferInitialQuestion: true,
      })
    ).resolves.toEqual(response);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/interview/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billId: "bill-1",
        deferInitialQuestion: true,
      }),
    });
  });

  it("初期化APIのエラーメッセージを利用者向けに返す", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Googleログインが必要です" }), {
        status: 401,
      })
    );

    await expect(
      callInitializeInterviewApi({
        billId: "bill-1",
        deferInitialQuestion: true,
      })
    ).rejects.toThrow("Googleログインが必要です");
  });
});

describe("callCompleteApi", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("正常レスポンス: report.idを含むレスポンスを返す", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ report: { id: "report-123" } }), {
        status: 200,
      })
    );

    const result = await callCompleteApi({
      sessionId: "session-1",
      isPublic: true,
    });

    expect(result).toEqual({ report: { id: "report-123" } });
  });

  it("正常レスポンス: 議員選択情報をそのまま返す", async () => {
    const recipientSelection = {
      candidates: [
        {
          id: "councilor-1",
          displayName: "世田谷 花子",
          iconUrl: "https://example.com/icon.jpg",
          source: "committee_member",
          sourceLabel: "委員会メンバー",
          recommended: true,
        },
      ],
      selectedCouncilorIds: [],
      selectedCouncilors: [],
      shareContact: false,
      alreadySentCouncilorIds: [],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          report: { id: "report-123" },
          recipientSelection,
        }),
        { status: 200 }
      )
    );

    const result = await callCompleteApi({
      sessionId: "session-1",
      isPublic: false,
    });

    expect(result).toEqual({
      report: { id: "report-123" },
      recipientSelection,
    });
  });

  it("エラーレスポンス(res.ok=false): data.errorメッセージでError throw", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
      })
    );

    await expect(
      callCompleteApi({ sessionId: "invalid", isPublic: false })
    ).rejects.toThrow("Session not found");
  });

  it('エラーレスポンスでjsonパースエラー: "Failed to complete interview"でError throw', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("not json", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(
      callCompleteApi({ sessionId: "session-1", isPublic: true })
    ).rejects.toThrow("Failed to complete interview");
  });

  it("POSTメソッドで正しいbodyが送信される", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ report: { id: "r-1" } }), { status: 200 })
    );

    await callCompleteApi({ sessionId: "session-42", isPublic: false });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/interview/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "session-42", isPublic: false }),
    });
  });

  it("includeRecipientSelection=falseを完了APIへ渡せる", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ report: { id: "r-1" } }), { status: 200 })
    );

    await callCompleteApi({
      sessionId: "session-42",
      isPublic: false,
      includeRecipientSelection: false,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/interview/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-42",
        isPublic: false,
        includeRecipientSelection: false,
      }),
    });
  });
});

describe("callRecipientCandidatesApi", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("議員候補APIのレスポンスを返す", async () => {
    const recipientSelection = {
      candidates: [],
      selectedCouncilorIds: [],
      selectedCouncilors: [],
      shareContact: false,
      alreadySentCouncilorIds: [],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ recipientSelection }), { status: 200 })
    );

    const result = await callRecipientCandidatesApi({
      sessionId: "session-1",
    });

    expect(result).toEqual({ recipientSelection });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/interview/recipient-candidates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1" }),
      }
    );
  });
});

describe("callUpdatePublicSettingApi", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("公開設定APIの成功レスポンスを返す", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const result = await callUpdatePublicSettingApi({
      sessionId: "session-1",
      isPublic: true,
    });

    expect(result).toEqual({ success: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/interview/public-setting",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1", isPublic: true }),
      }
    );
  });
});
