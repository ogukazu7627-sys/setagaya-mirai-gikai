import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
  getAuthenticatedClient,
  type TestUser,
} from "../utils";

const VERSION = "2026-09-20-admin-private-review-v1";
const PREVIOUS_VERSION = "2026-09-18-late-google-auth-v1";
const LEGACY_VERSION = "2026-09-16-receipt-v1";
const url = new URL(process.env.SUPABASE_URL ?? "http://127.0.0.1:54421");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Receipt integration tests require local Supabase");

describe("receipt completion and delivery RPCs (real local DB; no email provider)", () => {
  let user: TestUser;
  let other: TestUser;
  let campaignId: string;
  const sessionIds: string[] = [];

  beforeAll(async () => {
    user = await createTestUser(`receipt-${randomUUID()}@example.test`);
    other = await createTestUser(`other-${randomUUID()}@example.test`);
    const { data, error } = await adminClient
      .from("public_comment_campaigns")
      .insert({
        slug: `receipt-test-${randomUUID()}`,
        title: "receipt integration",
        submission_deadline: "2026-10-06T00:00:00Z",
        official_url: "https://example.test",
        submission_url: "https://example.test/submit",
        status: "draft",
      })
      .select()
      .single();
    if (error) throw error;
    campaignId = data.id;
  });

  afterAll(async () => {
    if (campaignId)
      await adminClient
        .from("public_comment_campaigns")
        .delete()
        .eq("id", campaignId);
    if (user) await cleanupTestUser(user.id);
    if (other) await cleanupTestUser(other.id);
  });

  async function fixture(
    options: { historical?: boolean; noDraft?: boolean; owner?: string } = {}
  ) {
    const { data, error } = await adminClient
      .from("public_comment_sessions")
      .insert({
        campaign_id: campaignId,
        user_id: options.owner ?? user.id,
        consented_at: new Date().toISOString(),
        consent_version: VERSION,
        receipt_opt_in: false,
      })
      .select()
      .single();
    if (error) throw error;
    sessionIds.push(data.id);
    const messages = [
      {
        session_id: data.id,
        role: "assistant",
        content: "質問\n空白  <原文>",
        stage: "interview",
        created_at: "2026-09-16T01:00:00Z",
      },
      {
        session_id: data.id,
        role: "user",
        content: '回答\nそのまま & "引用"',
        stage: "interview",
        created_at: "2026-09-16T01:00:01Z",
      },
    ];
    const inserted = await adminClient
      .from("public_comment_messages")
      .insert(messages);
    expect(inserted.error).toBeNull();
    if (!options.noDraft) {
      const draft = await adminClient.from("public_comment_drafts").insert({
        session_id: data.id,
        ai_body: "AI body",
        final_body: "  最終案\n編集済み  ",
        target_ordinances: ["条例1", "条例2"],
      });
      expect(draft.error).toBeNull();
    }
    if (options.historical) {
      expect(
        (
          await adminClient
            .from("public_comment_sessions")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", data.id)
        ).error
      ).toBeNull();
    }
    return { id: data.id, messages };
  }

  const complete = (id: string, optIn = true, owner?: string) =>
    adminClient.rpc("complete_public_comment_session", {
      p_session_id: id,
      p_user_id: owner ?? user.id,
      p_publication_requested: true,
      p_receipt_opt_in: optIn,
      p_consent_version: VERSION,
    });
  async function read(id: string) {
    const result = await adminClient
      .from("public_comment_receipts")
      .select()
      .eq("session_id", id)
      .maybeSingle();
    expect(result.error).toBeNull();
    return result.data;
  }
  const claim = (
    id: string,
    owner?: string,
    sender = "original@example.test"
  ) =>
    adminClient.rpc("claim_public_comment_receipt", {
      p_session_id: id,
      p_user_id: owner ?? user.id,
      p_sender: sender,
    });

  it("completes once, snapshots exact final body/transcript, uses verified auth email", async () => {
    const f = await fixture();
    const result = await complete(f.id);
    expect(result.error).toBeNull();
    expect(result.data).toBe("pending_review");
    const row = await read(f.id);
    expect(row).toMatchObject({
      recipient: user.email,
      subject: "AIインタビューの控え",
      final_body: "  最終案\n編集済み  ",
      consent_version: VERSION,
      idempotency_key: `public-comment-receipt/${f.id}`,
      attempt_count: 0,
    });
    expect(row?.conversation).toEqual(
      f.messages.map((m) => ({
        role: m.role,
        content: m.content,
        stage: m.stage,
        questionId: null,
      }))
    );
    expect(row?.body).toContain("【最終案】\n  最終案\n編集済み  \n");
    expect(row?.body).toContain("https://example.test/submit");
    expect(row?.body).toContain("自動提出されていません");
    for (const message of f.messages)
      expect(row?.body).toContain(message.content);
    expect((await complete(f.id, false)).data).toBe("pending_review");
    expect(await read(f.id)).toEqual(row);
  });

  it("retains no receipt for opt-out and historical completion", async () => {
    const optedOut = await fixture();
    expect((await complete(optedOut.id, false)).error).toBeNull();
    expect((await complete(optedOut.id, true)).error).toBeNull();
    expect(await read(optedOut.id)).toBeNull();
    const historical = await fixture({ historical: true });
    expect((await complete(historical.id)).data).toBe("private");
    expect(await read(historical.id)).toBeNull();
  });

  it("unauthorized/invalid/missing-draft completion rolls back", async () => {
    const f = await fixture({ noDraft: true });
    expect((await complete(f.id, true, other.id)).error).toBeTruthy();
    expect((await complete(f.id)).error).toBeTruthy();
    const session = await adminClient
      .from("public_comment_sessions")
      .select()
      .eq("id", f.id)
      .single();
    expect(session.data?.completed_at).toBeNull();
    expect(await read(f.id)).toBeNull();
    // Remove the still-active test session before another fixture for this owner.
    expect(
      (
        await adminClient
          .from("public_comment_sessions")
          .delete()
          .eq("id", f.id)
      ).error
    ).toBeNull();
  });

  it("rejects old consent without partially completing", async () => {
    const f = await fixture();
    const result = await adminClient.rpc("complete_public_comment_session", {
      p_session_id: f.id,
      p_user_id: user.id,
      p_publication_requested: true,
      p_receipt_opt_in: true,
      p_consent_version: "2026-09-16",
    });
    expect(result.error?.message).toContain("public_comment_invalid_consent");
    expect(await read(f.id)).toBeNull();
    expect((await complete(f.id)).error).toBeNull();
  });

  it.each([
    PREVIOUS_VERSION,
    LEGACY_VERSION,
  ])("accepts the previous consent version %s", async (consentVersion) => {
    const f = await fixture();
    const result = await adminClient.rpc("complete_public_comment_session", {
      p_session_id: f.id,
      p_user_id: user.id,
      p_publication_requested: true,
      p_receipt_opt_in: true,
      p_consent_version: consentVersion,
    });
    expect(result.error).toBeNull();
    expect(result.data).toBe("pending_review");
    expect(await read(f.id)).toMatchObject({
      consent_version: consentVersion,
      recipient: user.email,
    });
  });

  it("completed private comments can never transition to a public status", async () => {
    const f = await fixture();
    const result = await adminClient.rpc("complete_public_comment_session", {
      p_session_id: f.id,
      p_user_id: user.id,
      p_publication_requested: false,
      p_receipt_opt_in: false,
      p_consent_version: VERSION,
    });
    expect(result.error).toBeNull();
    expect(result.data).toBe("private");

    const publication = await adminClient
      .from("public_comment_sessions")
      .update({ publication_status: "published" })
      .eq("id", f.id);

    expect(publication.error?.message).toContain(
      "completed_private_public_comment_is_immutable"
    );
    const session = await adminClient
      .from("public_comment_sessions")
      .select("publication_status")
      .eq("id", f.id)
      .single();
    expect(session.error).toBeNull();
    expect(session.data?.publication_status).toBe("private");
  });

  it("unverified auth email never becomes a sendable recipient", async () => {
    const created = await adminClient.auth.admin.createUser({
      email: `unverified-${randomUUID()}@example.test`,
      email_confirm: false,
    });
    expect(created.error).toBeNull();
    const unverified = created.data.user;
    if (!unverified) throw new Error("missing auth test user");
    try {
      const f = await fixture({ owner: unverified.id });
      expect((await complete(f.id, true, unverified.id)).error).toBeNull();
      expect(await read(f.id)).toMatchObject({
        recipient: null,
        status: "needs_review",
        first_attempt_at: null,
      });
      expect((await claim(f.id, unverified.id)).data).toEqual([]);
    } finally {
      await cleanupTestUser(unverified.id);
    }
  });

  it("serializes simultaneous completions and claims", async () => {
    const f = await fixture();
    const completions = await Promise.all([complete(f.id), complete(f.id)]);
    expect(completions.map((r) => r.error)).toEqual([null, null]);
    const claims = await Promise.all([claim(f.id), claim(f.id)]);
    expect(claims.map((r) => r.error)).toEqual([null, null]);
    expect(claims.flatMap((r) => r.data ?? [])).toHaveLength(1);
    expect((await read(f.id))?.attempt_count).toBe(1);
    expect((await claim(f.id, other.id)).data).toEqual([]);
  });

  it("late child writes and reopening are blocked; moderation remains usable", async () => {
    const f = await fixture();
    await complete(f.id);
    const late = await adminClient.from("public_comment_messages").insert({
      session_id: f.id,
      role: "assistant",
      stage: "interview",
      content: "late AI",
    });
    expect(late.error?.message).toContain("public_comment_completed");
    const draft = await adminClient
      .from("public_comment_drafts")
      .update({ final_body: "late" })
      .eq("session_id", f.id);
    expect(draft.error?.message).toContain("public_comment_completed");
    expect(
      (
        await adminClient
          .from("public_comment_sessions")
          .update({ completed_at: null })
          .eq("id", f.id)
      ).error
    ).toBeTruthy();
    expect(
      (
        await adminClient
          .from("public_comment_sessions")
          .update({ publication_status: "published" })
          .eq("id", f.id)
      ).error
    ).toBeNull();
    expect(
      (
        await adminClient
          .from("public_comment_drafts")
          .update({
            reviewed_at: new Date().toISOString(),
            reviewed_by: other.id,
          })
          .eq("session_id", f.id)
      ).error
    ).toBeNull();
    expect((await read(f.id))?.final_body).toBe("  最終案\n編集済み  ");
  });

  it("a completion racing child writes always matches the frozen DB content", async () => {
    const f = await fixture();
    const [, message, draft] = await Promise.all([
      complete(f.id),
      adminClient.from("public_comment_messages").insert({
        session_id: f.id,
        role: "user",
        stage: "interview",
        content: "racing message",
      }),
      adminClient.rpc("save_public_comment_draft", {
        p_session_id: f.id,
        p_user_id: user.id,
        p_final_body: "racing edit",
        p_target_ordinances: ["条例1", "条例2"],
      }),
    ]);
    if (message.error)
      expect(message.error.message).toContain("public_comment_completed");
    if (draft.error)
      expect(draft.error.message).toContain("public_comment_completed");
    const row = await read(f.id);
    const messages = await adminClient
      .from("public_comment_messages")
      .select()
      .eq("session_id", f.id);
    const final = await adminClient
      .from("public_comment_drafts")
      .select()
      .eq("session_id", f.id)
      .single();
    expect(row?.conversation).toHaveLength(messages.data?.length ?? -1);
    expect(row?.final_body).toBe(final.data?.final_body);
  });

  it("in-flight message and draft writers wait for the completion row lock and cannot mutate its snapshot", async () => {
    const f = await fixture();
    // Hold the completion transaction open so both HTTP writes reach a real locked row.
    const sql = `begin; select public.complete_public_comment_session('${f.id}', '${user.id}', true, true, '${VERSION}'); select 'receipt_test_lock_held'; select pg_sleep(0.5); commit;`;
    const child = spawn("docker", [
      "exec",
      "-i",
      "supabase_db_mirai-gikai",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ]);
    const done = new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error("local transaction failed"))
      );
    });
    const locked = new Promise<void>((resolve, reject) => {
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (output.includes("receipt_test_lock_held")) resolve();
      });
      child.on("error", reject);
      child.on("close", () => {
        if (!output.includes("receipt_test_lock_held"))
          reject(new Error("lock not acquired"));
      });
    });
    await locked;
    const [message, draft] = await Promise.all([
      adminClient.from("public_comment_messages").insert({
        session_id: f.id,
        role: "assistant",
        stage: "interview",
        content: "late generated reply",
      }),
      adminClient.rpc("save_public_comment_draft", {
        p_session_id: f.id,
        p_user_id: user.id,
        p_final_body: "late generated draft",
        p_target_ordinances: ["条例1", "条例2"],
      }),
    ]);
    await done;
    expect(message.error?.message).toContain("public_comment_completed");
    expect(draft.error?.message).toContain("public_comment_completed");
    const receipt = await read(f.id);
    expect(receipt?.final_body).toBe("  最終案\n編集済み  ");
    expect(receipt?.conversation).toHaveLength(2);
  });

  it("missing configuration is failed/retryable without starting the send window", async () => {
    const f = await fixture();
    await complete(f.id);
    const result = await adminClient.rpc("claim_public_comment_receipt", {
      p_session_id: f.id,
      p_user_id: user.id,
      p_sender: "",
      p_config_failure: "configuration",
    });
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(await read(f.id)).toMatchObject({
      status: "failed",
      attempt_count: 0,
      first_attempt_at: null,
      sender: null,
    });
    expect((await claim(f.id)).data).toEqual([]);
  });

  it("lease token, cooldown, immutable payload, and deterministic key survive retries", async () => {
    const f = await fixture();
    await complete(f.id);
    const first = (await claim(f.id)).data?.[0];
    expect(first).toBeTruthy();
    if (!first?.lease_token) throw new Error("missing claim");
    await adminClient.rpc("finish_public_comment_receipt", {
      p_receipt_id: first.id,
      p_lease_token: randomUUID(),
      p_provider_id: "stale",
    });
    expect((await read(f.id))?.status).toBe("pending");
    expect(
      (
        await adminClient
          .from("public_comment_receipts")
          .update({ body: "changed" })
          .eq("id", first.id)
      ).error
    ).toBeTruthy();
    expect(
      (
        await adminClient
          .from("public_comment_receipts")
          .update({ sender: "changed@example.test" })
          .eq("id", first.id)
      ).error
    ).toBeTruthy();
    await adminClient.rpc("finish_public_comment_receipt", {
      p_receipt_id: first.id,
      p_lease_token: first.lease_token,
    });
    expect((await claim(f.id)).data).toEqual([]);
    await adminClient
      .from("public_comment_receipts")
      .update({ next_attempt_at: new Date(Date.now() - 1_000).toISOString() })
      .eq("id", first.id);
    const retry = (await claim(f.id, user.id, "changed@example.test"))
      .data?.[0];
    expect(retry).toMatchObject({
      sender: first.sender,
      body: first.body,
      recipient: first.recipient,
      subject: first.subject,
      idempotency_key: first.idempotency_key,
      first_attempt_at: first.first_attempt_at,
      attempt_count: 2,
    });
    if (!retry?.lease_token) throw new Error("missing retry claim");
    await adminClient.rpc("finish_public_comment_receipt", {
      p_receipt_id: retry.id,
      p_lease_token: retry.lease_token,
      p_provider_id: "accepted-id",
    });
    expect((await read(f.id))?.status).toBe("accepted");
    expect((await claim(f.id)).data).toEqual([]);
  });

  it.each([
    "expired",
    "cap",
  ])("stops retries at %s and allows reclaim only after lease expiry", async (reason) => {
    const f = await fixture();
    await complete(f.id);
    const first = (await claim(f.id)).data?.[0];
    if (!first) throw new Error("missing first claim");
    await adminClient
      .from("public_comment_receipts")
      .update({
        lease_expires_at: new Date(Date.now() - 1000).toISOString(),
        next_attempt_at: null,
      })
      .eq("id", first.id);
    expect((await claim(f.id)).data).toHaveLength(1);
    await adminClient
      .from("public_comment_receipts")
      .update({
        lease_expires_at: new Date(Date.now() - 1000).toISOString(),
        next_attempt_at: null,
        ...(reason === "expired"
          ? {
              first_attempt_at: new Date(
                Date.now() - 23 * 3600_000
              ).toISOString(),
            }
          : { attempt_count: 10 }),
      })
      .eq("id", first.id);
    expect((await claim(f.id)).data).toEqual([]);
    expect((await read(f.id))?.status).toBe("needs_review");
  });

  it("does not expose receipts or permit RPC calls to browser roles", async () => {
    const clients = [
      getAnonClient(),
      await getAuthenticatedClient(user.email, user.password),
    ];
    for (const client of clients) {
      const result = await client.from("public_comment_receipts").select();
      expect(result.data ?? []).toEqual([]);
      const call = await client.rpc("claim_public_comment_receipt", {
        p_session_id: sessionIds[0],
        p_user_id: user.id,
        p_sender: "spoof@example.test",
      });
      expect(call.error).toBeTruthy();
      const completion = await client.rpc("complete_public_comment_session", {
        p_session_id: sessionIds[0],
        p_user_id: user.id,
        p_publication_requested: true,
        p_receipt_opt_in: true,
        p_consent_version: VERSION,
      });
      expect(completion.error).toBeTruthy();
      const finish = await client.rpc("finish_public_comment_receipt", {
        p_receipt_id: randomUUID(),
        p_lease_token: randomUUID(),
        p_provider_id: "spoof",
      });
      expect(finish.error).toBeTruthy();
      const write = await client
        .from("public_comment_receipts")
        .update({ status: "accepted" })
        .eq("session_id", sessionIds[0]);
      expect(write.error).toBeTruthy();
    }
  });
});
