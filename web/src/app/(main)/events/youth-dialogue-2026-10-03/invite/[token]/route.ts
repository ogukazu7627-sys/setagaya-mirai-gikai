import { NextResponse } from "next/server";
import { z } from "zod";
import { YOUTH_DIALOGUE_EVENT_PATH } from "@/features/public-comment/shared/funnel";
import { recordEventInvitationClick } from "@/features/public-comment/shared/server/funnel-repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const parsed = z.uuid().safeParse(token);
  const requestUrl = new URL(request.url);
  if (!parsed.success)
    return NextResponse.redirect(
      new URL(YOUTH_DIALOGUE_EVENT_PATH, requestUrl)
    );

  try {
    const publicToken = await recordEventInvitationClick(parsed.data);
    const destination = new URL(YOUTH_DIALOGUE_EVENT_PATH, requestUrl);
    destination.searchParams.set("attribution", publicToken);
    destination.hash = "registration";
    return NextResponse.redirect(destination, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.redirect(
      new URL(YOUTH_DIALOGUE_EVENT_PATH, requestUrl)
    );
  }
}
