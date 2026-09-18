import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  updateDraft,
  upsertDraft,
} from "../../../web/src/features/public-comment/minpaku/server/repository";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
  getAuthenticatedClient,
  type TestUser,
} from "../utils";

if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.SUPABASE_URL ?? "http://127.0.0.1:54421").hostname
  )
)
  throw new Error("Local Supabase required");

describe("save_public_comment_draft parent-first locking (real DB)", () => {
  let user: TestUser;
  let campaignId: string;
  let sessionId: string;
  beforeAll(async () => {
    user = await createTestUser(`draft-rpc-${randomUUID()}@example.test`);
    const { data, error } = await adminClient
      .from("public_comment_campaigns")
      .insert({
        slug: `draft-rpc-${randomUUID()}`,
        title: "test",
        submission_deadline: "2026-10-06T00:00:00Z",
        official_url: "https://example.test",
        submission_url: "https://example.test/submit",
      })
      .select()
      .single();
    if (error) throw error;
    campaignId = data.id;
  });
  beforeEach(async () => {
    const { data, error } = await adminClient
      .from("public_comment_sessions")
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        consented_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    sessionId = data.id;
  });
  afterEach(async () => {
    if (sessionId)
      expect(
        (
          await adminClient
            .from("public_comment_sessions")
            .delete()
            .eq("id", sessionId)
        ).error
      ).toBeNull();
  });
  afterAll(async () => {
    if (campaignId)
      await adminClient
        .from("public_comment_campaigns")
        .delete()
        .eq("id", campaignId);
    if (user) await cleanupTestUser(user.id);
  });

  const save = (text = "draft") =>
    upsertDraft({
      sessionId,
      userId: user.id,
      finalBody: text,
      aiBody: text,
      targetOrdinances: ["ordinance"],
      sourceRefs: [],
      factCheckNotes: [],
    });
  const complete = () =>
    adminClient.rpc("complete_public_comment_session", {
      p_session_id: sessionId,
      p_user_id: user.id,
      p_publication_requested: false,
      p_receipt_opt_in: true,
      p_consent_version: "2026-09-16-receipt-v1",
    });

  it("repository generation/PATCH both save via owner-checked RPC", async () => {
    const created = await save();
    expect(created.final_body).toBe("draft");
    const updated = await updateDraft({
      sessionId,
      userId: user.id,
      finalBody: "  exact\n",
      targetOrdinances: ["ordinance"],
    });
    expect(updated.final_body).toBe("  exact\n");
    await expect(
      updateDraft({
        sessionId,
        userId: randomUUID(),
        finalBody: "spoof",
        targetOrdinances: [],
      })
    ).rejects.toThrow();
    expect((await complete()).error).toBeNull();
    await expect(save("late")).rejects.toThrow("public_comment_completed");
    await expect(
      updateDraft({
        sessionId,
        userId: user.id,
        finalBody: "late",
        targetOrdinances: [],
      })
    ).rejects.toThrow("public_comment_completed");
  });

  it("concurrent generation/PATCH and completion cannot deadlock or diverge from receipt", async () => {
    await save();
    const results = await Promise.allSettled([
      save("generated race"),
      updateDraft({
        sessionId,
        userId: user.id,
        finalBody: "patch race",
        targetOrdinances: ["ordinance"],
      }),
      complete().then((result) => {
        if (result.error) throw new Error(result.error.code);
      }),
    ]);
    expect(results[2].status).toBe("fulfilled");
    for (const result of results.slice(0, 2)) {
      if (result.status === "rejected")
        expect(result.reason.message).toBe("public_comment_completed");
    }
    const draft = await adminClient
      .from("public_comment_drafts")
      .select("final_body")
      .eq("session_id", sessionId)
      .single();
    const receipt = await adminClient
      .from("public_comment_receipts")
      .select("final_body")
      .eq("session_id", sessionId)
      .single();
    expect(draft.error).toBeNull();
    expect(receipt.error).toBeNull();
    expect(receipt.data?.final_body).toBe(draft.data?.final_body);
  });

  it("completion waits for a draft RPC holding parent-first locks, then snapshots that draft", async () => {
    await save();
    const sql = `begin; select public.save_public_comment_draft('${sessionId}', '${user.id}', 'locked writer', array['ordinance']); select 'draft_test_lock_held'; select pg_sleep(0.5); commit;`;
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
        code === 0
          ? resolve()
          : reject(new Error("local writer transaction failed"))
      );
    });
    const locked = new Promise<void>((resolve, reject) => {
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (output.includes("draft_test_lock_held")) resolve();
      });
      child.on("error", reject);
      child.on("close", () => {
        if (!output.includes("draft_test_lock_held"))
          reject(new Error("writer lock not acquired"));
      });
    });
    await locked;
    const result = await complete();
    await done;
    expect(result.error).toBeNull();
    const receipt = await adminClient
      .from("public_comment_receipts")
      .select()
      .eq("session_id", sessionId)
      .single();
    expect(receipt.data?.final_body).toBe("locked writer");
  });

  it("browser roles cannot call the save RPC even with the correct owner", async () => {
    for (const client of [
      getAnonClient(),
      await getAuthenticatedClient(user.email, user.password),
    ]) {
      const result = await client.rpc("save_public_comment_draft", {
        p_session_id: sessionId,
        p_user_id: user.id,
        p_final_body: "spoof",
        p_target_ordinances: [],
        p_ai_body: "spoof",
      });
      expect(result.error).toBeTruthy();
    }
  });
});
