import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicCommentActor } from "@/features/public-comment/minpaku/server/auth";
import {
  createAuthHandoff,
  findSessionForUser,
} from "@/features/public-comment/minpaku/server/repository";
import {
  PUBLIC_COMMENT_AUTH_HANDOFF_COOKIE,
  PUBLIC_COMMENT_AUTH_HANDOFF_MAX_AGE_SECONDS,
} from "@/features/public-comment/shared/auth-handoff";
import { hashPublicCommentAuthToken } from "@/features/public-comment/shared/server/auth-handoff";

const requestSchema = z.object({ sessionId: z.uuid() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "セッションを確認できません" },
      { status: 400 }
    );

  const actor = await getPublicCommentActor();
  if (!actor)
    return NextResponse.json(
      { error: "セッションを確認できません" },
      { status: 401 }
    );
  if (!actor.is_anonymous) return NextResponse.json({ handoffRequired: false });

  const session = await findSessionForUser(parsed.data.sessionId, actor.id);
  if (!session || session.completed_at)
    return NextResponse.json(
      { error: "セッションが見つかりません" },
      { status: 404 }
    );

  const token = randomUUID();
  await createAuthHandoff({
    sessionId: session.id,
    anonymousUserId: actor.id,
    tokenHash: hashPublicCommentAuthToken(token),
    expiresAt: new Date(
      Date.now() + PUBLIC_COMMENT_AUTH_HANDOFF_MAX_AGE_SECONDS * 1000
    ).toISOString(),
  });

  const response = NextResponse.json({ handoffRequired: true });
  response.cookies.set(PUBLIC_COMMENT_AUTH_HANDOFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PUBLIC_COMMENT_AUTH_HANDOFF_MAX_AGE_SECONDS,
  });
  return response;
}
