import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createShortLinkFunnelVisit } from "./funnel-repository";

const pathTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function createPaidSocialRedirect(params: {
  request: Request;
  campaign: string;
  content: string;
  journeyType: "interview" | "event_direct";
  adTheme: string;
  landingPath: string;
}) {
  const parsed = z
    .object({ campaign: pathTagSchema, content: pathTagSchema })
    .safeParse({ campaign: params.campaign, content: params.content });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "広告リンクが不正です" },
      { status: 404 }
    );
  }

  try {
    const publicToken = await createShortLinkFunnelVisit({
      journeyType: params.journeyType,
      adTheme: params.adTheme,
      landingPath: params.landingPath,
      utmCampaign: parsed.data.campaign,
      utmContent: parsed.data.content,
    });
    const url = new URL(params.landingPath, params.request.url);
    url.searchParams.set("utm_source", "instagram");
    url.searchParams.set("utm_medium", "paid_social");
    url.searchParams.set("utm_campaign", parsed.data.campaign);
    url.searchParams.set("utm_content", parsed.data.content);
    url.searchParams.set("attribution", publicToken);
    return NextResponse.redirect(url, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "広告リンクを開けませんでした" },
      { status: 500 }
    );
  }
}
