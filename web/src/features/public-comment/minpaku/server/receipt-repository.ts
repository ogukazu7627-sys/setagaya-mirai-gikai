import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";

export type ReceiptRecord =
  Database["public"]["Tables"]["public_comment_receipts"]["Row"];

export interface ReceiptRepository {
  find(sessionId: string, userId: string): Promise<ReceiptRecord | null>;
  claim(params: {
    sessionId: string;
    userId: string;
    sender: string;
    configFailure: string | null;
  }): Promise<ReceiptRecord | null>;
  finish(params: {
    receiptId: string;
    leaseToken: string;
    providerId?: string;
    needsReview: boolean;
  }): Promise<void>;
}

export const receiptRepository: ReceiptRepository = {
  async find(sessionId, userId) {
    const { data, error } = await createAdminClient()
      .from("public_comment_receipts")
      .select("*, public_comment_sessions!inner(user_id)")
      .eq("session_id", sessionId)
      .eq("public_comment_sessions.user_id", userId)
      .maybeSingle();
    if (error) throw new Error("receipt_read_failed");
    return data;
  },
  async claim({ sessionId, userId, sender, configFailure }) {
    const { data, error } = await createAdminClient().rpc(
      "claim_public_comment_receipt",
      {
        p_session_id: sessionId,
        p_user_id: userId,
        p_sender: sender,
        ...(configFailure ? { p_config_failure: configFailure } : {}),
      }
    );
    if (error) throw new Error("receipt_claim_failed");
    return data?.[0] ?? null;
  },
  async finish({ receiptId, leaseToken, providerId, needsReview }) {
    const { error } = await createAdminClient().rpc(
      "finish_public_comment_receipt",
      {
        p_receipt_id: receiptId,
        p_lease_token: leaseToken,
        ...(providerId ? { p_provider_id: providerId } : {}),
        p_needs_review: needsReview,
      }
    );
    if (error) throw new Error("receipt_finish_failed");
  },
};
