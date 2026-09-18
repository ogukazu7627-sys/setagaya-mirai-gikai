import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPublicCommentFixture } from "../public-comment-utils";
import { adminClient, getAnonClient } from "../utils";

describe("commit_public_comment_interview_turn", () => {
  let fixture: Awaited<ReturnType<typeof createPublicCommentFixture>>;
  let session: Awaited<ReturnType<typeof fixture.createSession>>;
  beforeEach(async () => {
    fixture = await createPublicCommentFixture();
    session = await fixture.createSession();
  });
  afterEach(async () => {
    await fixture?.cleanup();
  });
  const args = () => ({
    p_session_id: session.id,
    p_user_id: fixture.user.id,
    p_campaign_id: fixture.campaign.id,
    p_request_id: crypto.randomUUID(),
    p_expected_revision: 0,
    p_state: { version: 1, mode: "loop", phase: "questions" },
    p_user_content: "私の意見",
    p_user_question_id: "q1",
    p_assistant_content: "確認したいこと",
    p_assistant_question_id: "q1",
  });
  const messages = () =>
    adminClient
      .from("public_comment_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at");
  it("状態と2発言を原子的に保存し、再送は同じ応答を返す", async () => {
    const input = args();
    const first = await adminClient.rpc(
      "commit_public_comment_interview_turn",
      input
    );
    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({ revision: 1, userMessageStored: true });
    const replay = await adminClient.rpc(
      "commit_public_comment_interview_turn",
      input
    );
    expect(replay.data).toEqual(first.data);
    const saved = await messages();
    expect(saved.data?.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(saved.data?.[0].id).toBe(input.p_request_id);
    if (!saved.data) throw new Error("Messages were not saved");
    expect(new Date(saved.data[0].created_at).getTime()).toBeLessThanOrEqual(
      new Date(saved.data[1].created_at).getTime()
    );
  });
  it("同じrevisionの並行送信は一つしか保存しない", async () => {
    const results = await Promise.all([
      adminClient.rpc("commit_public_comment_interview_turn", args()),
      adminClient.rpc("commit_public_comment_interview_turn", args()),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.message).toContain(
      "public_comment_stale_turn"
    );
    expect((await messages()).data).toHaveLength(2);
  });
  it("他ユーザー・他キャンペーンの更新を拒否する", async () => {
    for (const override of [
      { p_user_id: crypto.randomUUID() },
      { p_campaign_id: crypto.randomUUID() },
    ]) {
      const result = await adminClient.rpc(
        "commit_public_comment_interview_turn",
        { ...args(), ...override }
      );
      expect(result.error?.message).toContain(
        "public_comment_session_not_found"
      );
    }
    expect((await messages()).data).toHaveLength(0);
  });
  it("不正状態・発言保存失敗は状態も発言も残さない", async () => {
    const invalid = await adminClient.rpc(
      "commit_public_comment_interview_turn",
      { ...args(), p_state: { version: 1 } }
    );
    expect(invalid.error?.message).toContain("public_comment_invalid_state");
    // A null request UUID fails when inserting the replay record, after both messages.
    // PostgreSQL must roll back the complete turn, not leave partial messages.
    const failed = await adminClient.rpc(
      "commit_public_comment_interview_turn",
      {
        ...args(),
        p_request_id: null as unknown as string,
        p_user_content: undefined,
      }
    );
    expect(failed.error).not.toBeNull();
    expect((await messages()).data).toHaveLength(0);
    const saved = await adminClient
      .from("public_comment_sessions")
      .select("interview_revision")
      .eq("id", session.id)
      .single();
    expect(saved.data?.interview_revision).toBe(0);
  });
  it("安全案内はユーザー発言を保存せず、完了後は新たな更新を拒否する", async () => {
    const input = args();
    const safe = await adminClient.rpc("commit_public_comment_interview_turn", {
      ...input,
      p_user_content: undefined,
    });
    expect(safe.data).toMatchObject({ userMessageStored: false });
    expect((await messages()).data?.map((m) => m.role)).toEqual(["assistant"]);
    await adminClient
      .from("public_comment_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", session.id);
    const failed = await adminClient.rpc(
      "commit_public_comment_interview_turn",
      { ...args(), p_expected_revision: 1 }
    );
    expect(failed.error?.message).toContain("public_comment_completed");
    expect((await messages()).data).toHaveLength(1);
  });
  it("匿名利用者はRPC実行・内部スキップ状態の閲覧ができない", async () => {
    await adminClient.rpc("commit_public_comment_interview_turn", args());
    const anon = getAnonClient();
    expect(
      (await anon.rpc("commit_public_comment_interview_turn", args())).error
    ).not.toBeNull();
    const visible = await anon
      .from("public_comment_interview_turns")
      .select("*")
      .eq("session_id", session.id);
    expect(visible.data ?? []).toEqual([]);
  });
});
