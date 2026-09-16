import "server-only";

import type { PublicCommentReceipt } from "../shared/receipt";
import {
  createResendReceiptProvider,
  type ReceiptProvider,
} from "./receipt-provider";
import {
  type ReceiptRepository,
  receiptRepository,
} from "./receipt-repository";
import { receiptStatus } from "./utils/receipt-status";

type ReceiptEnvironment = {
  PUBLIC_COMMENT_RECEIPT_EMAIL_ENABLED?: string;
  PUBLIC_COMMENT_RECEIPT_FROM?: string;
  PUBLIC_COMMENT_RECEIPT_TEST_EMAIL?: string;
  RESEND_API_KEY?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

export async function sendPublicCommentReceipt(
  sessionId: string,
  userId: string,
  dependencies: {
    repository?: ReceiptRepository;
    provider?: ReceiptProvider;
    env?: ReceiptEnvironment;
  } = {}
): Promise<PublicCommentReceipt> {
  const repository = dependencies.repository ?? receiptRepository;
  const env = dependencies.env ?? process.env;
  try {
    const existing = await repository.find(sessionId, userId);
    const current = receiptStatus(existing);
    if (!existing || !current.canRetry) return current;
    const production = env.VERCEL_ENV === "production";
    const recipientAllowed =
      production ||
      existing.recipient === env.PUBLIC_COMMENT_RECEIPT_TEST_EMAIL;
    const configured =
      env.PUBLIC_COMMENT_RECEIPT_EMAIL_ENABLED === "true" &&
      !!(existing.sender || env.PUBLIC_COMMENT_RECEIPT_FROM) &&
      (dependencies.provider ||
        (env.NODE_ENV !== "test" && !!env.RESEND_API_KEY && recipientAllowed));
    const claimed = await repository.claim({
      sessionId,
      userId,
      sender: env.PUBLIC_COMMENT_RECEIPT_FROM ?? "",
      configFailure: configured ? null : "configuration",
    });
    if (claimed?.lease_token && claimed.sender && claimed.recipient) {
      const provider =
        dependencies.provider ??
        createResendReceiptProvider(env.RESEND_API_KEY ?? "");
      // Recheck the durable deadline immediately before crossing the network boundary.
      const expired =
        !claimed.first_attempt_at ||
        Date.now() - Date.parse(claimed.first_attempt_at) >=
          23 * 60 * 60 * 1000;
      const result = expired
        ? { status: "needs_review" as const }
        : await provider
            .send({
              from: claimed.sender,
              to: claimed.recipient,
              subject: claimed.subject,
              text: claimed.body,
              idempotencyKey: claimed.idempotency_key,
            })
            .catch(() => ({ status: "failed" as const }));
      await repository.finish({
        receiptId: claimed.id,
        leaseToken: claimed.lease_token,
        providerId: result.status === "accepted" ? result.id : undefined,
        needsReview: result.status === "needs_review",
      });
      if (result.status !== "accepted")
        console.warn("public_comment_receipt_send_failed");
    } else if (!configured) {
      console.warn("public_comment_receipt_configuration_unavailable");
    }
    return receiptStatus(await repository.find(sessionId, userId));
  } catch {
    // No provider exceptions, addresses, transcript, or request bodies in logs.
    console.warn("public_comment_receipt_processing_failed");
    return { status: "pending", canRetry: true };
  }
}
