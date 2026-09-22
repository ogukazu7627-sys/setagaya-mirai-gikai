import { NextResponse } from "next/server";
import { z } from "zod";
import { YOUTH_DIALOGUE_INTERVIEW_RSVP_URL } from "@/features/public-comment/shared/funnel";
import { recordEventInvitationClick } from "@/features/public-comment/shared/server/funnel-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const parsed = z.uuid().safeParse(token);
  if (!parsed.success) {
    return NextResponse.redirect(YOUTH_DIALOGUE_INTERVIEW_RSVP_URL, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  try {
    await recordEventInvitationClick(parsed.data);
    return NextResponse.redirect(YOUTH_DIALOGUE_INTERVIEW_RSVP_URL, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.redirect(YOUTH_DIALOGUE_INTERVIEW_RSVP_URL, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
