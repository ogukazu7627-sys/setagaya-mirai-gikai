import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { updateEventInvitationDelivery } from "@/features/public-comment/shared/server/funnel-repository";

const payloadSchema = z.object({
  type: z.enum([
    "email.delivered",
    "email.bounced",
    "email.complained",
    "email.suppressed",
  ]),
  data: z.object({ email_id: z.string().min(1) }),
});

const statusByType = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
} as const;

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  try {
    const verified = new Resend().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    });
    const parsed = payloadSchema.safeParse(verified);
    if (!parsed.success) return NextResponse.json({ received: true });
    await updateEventInvitationDelivery({
      providerId: parsed.data.data.email_id,
      status: statusByType[parsed.data.type],
    });
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
