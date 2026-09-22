import { NextResponse } from "next/server";
import { z } from "zod";
import { YOUTH_DIALOGUE_DIRECT_RSVP_URL } from "@/features/public-comment/shared/funnel";
import { recordEventSignupLinkClick } from "@/features/public-comment/shared/server/funnel-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = z.uuid().safeParse(url.searchParams.get("attribution"));
  if (!parsed.success) {
    return NextResponse.redirect(YOUTH_DIALOGUE_DIRECT_RSVP_URL, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  try {
    await recordEventSignupLinkClick(parsed.data);
    return NextResponse.redirect(YOUTH_DIALOGUE_DIRECT_RSVP_URL, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.redirect(YOUTH_DIALOGUE_DIRECT_RSVP_URL, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
