import { NextResponse } from "next/server";
import { z } from "zod";
import { YOUTH_DIALOGUE_EVENT_PATH } from "@/features/public-comment/shared/funnel";
import { recordEventSignupLinkClick } from "@/features/public-comment/shared/server/funnel-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = z.uuid().safeParse(url.searchParams.get("attribution"));
  if (!parsed.success)
    return NextResponse.redirect(new URL(YOUTH_DIALOGUE_EVENT_PATH, url));

  try {
    const publicToken = await recordEventSignupLinkClick(parsed.data);
    const destination = new URL(YOUTH_DIALOGUE_EVENT_PATH, url);
    destination.searchParams.set("attribution", publicToken);
    destination.hash = "registration";
    return NextResponse.redirect(destination, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.redirect(
      new URL(`${YOUTH_DIALOGUE_EVENT_PATH}#registration`, url)
    );
  }
}
