import "server-only";

export type ReceiptEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type ReceiptSendResult =
  | { status: "accepted"; id: string }
  | { status: "failed" | "needs_review" };

export interface ReceiptProvider {
  send(email: ReceiptEmail): Promise<ReceiptSendResult>;
}

export function createResendReceiptProvider(
  apiKey: string,
  request: typeof fetch = fetch
): ReceiptProvider {
  return {
    async send(email) {
      try {
        const response = await request("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": email.idempotencyKey,
          },
          body: JSON.stringify({
            from: email.from,
            to: [email.to],
            subject: email.subject,
            text: email.text,
            html: email.html,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          // Conflicting payloads must never be retried with a new key.
          const body = await response.json().catch(() => null);
          return {
            status:
              response.status === 409 &&
              body?.name === "invalid_idempotent_request"
                ? "needs_review"
                : "failed",
          };
        }
        const body = await response.json();
        return typeof body?.id === "string" && body.id.length > 0
          ? { status: "accepted", id: body.id }
          : { status: "failed" };
      } catch {
        return { status: "failed" };
      }
    },
  };
}
