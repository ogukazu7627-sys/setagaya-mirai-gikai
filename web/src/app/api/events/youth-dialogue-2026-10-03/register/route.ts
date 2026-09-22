import { NextResponse } from "next/server";
import { z } from "zod";
import {
  YOUTH_DIALOGUE_AGREEMENT_VERSION,
  YOUTH_DIALOGUE_INTERESTS,
} from "@/features/public-comment/shared/funnel";
import { registerYouthDialogueEvent } from "@/features/public-comment/shared/server/funnel-repository";
import { consumeAnonymousRateLimit } from "@/lib/api/anonymous-rate-limit";

const requestSchema = z.object({
  publicToken: z.uuid(),
  attendeeName: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  interests: z.array(z.enum(YOUTH_DIALOGUE_INTERESTS)).min(1).max(6),
  agreementsAccepted: z.literal(true),
  note: z.string().trim().max(1000).nullable().optional(),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "必須項目と入力内容を確認してください" },
      { status: 400 }
    );
  }

  try {
    const allowed = await consumeAnonymousRateLimit({
      request,
      installationId: parsed.data.publicToken,
      routeKey: "youth-dialogue-registration",
      windowMs: 60 * 60 * 1000,
      installationLimit: 5,
      ipLimit: 20,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "短時間に送信が集中しました。しばらくしてからお試しください" },
        { status: 429 }
      );
    }

    const registrationId = await registerYouthDialogueEvent({
      publicToken: parsed.data.publicToken,
      attendeeName: parsed.data.attendeeName,
      email: parsed.data.email,
      interests: [...new Set(parsed.data.interests)],
      agreementVersion: YOUTH_DIALOGUE_AGREEMENT_VERSION,
      note: parsed.data.note,
    });
    return NextResponse.json({ registrationId });
  } catch {
    return NextResponse.json(
      { error: "申込を保存できませんでした。時間をおいて再度お試しください" },
      { status: 500 }
    );
  }
}
