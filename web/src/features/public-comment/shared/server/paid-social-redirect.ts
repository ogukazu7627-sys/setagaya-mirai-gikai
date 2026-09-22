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
  destinationUrl?: string;
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

  const destination = params.destinationUrl
    ? new URL(params.destinationUrl)
    : new URL(params.landingPath, params.request.url);

  try {
    const publicToken = await createShortLinkFunnelVisit({
      journeyType: params.journeyType,
      adTheme: params.adTheme,
      landingPath: params.landingPath,
      utmCampaign: parsed.data.campaign,
      utmContent: parsed.data.content,
    });
    if (!params.destinationUrl) {
      destination.searchParams.set("utm_source", "instagram");
      destination.searchParams.set("utm_medium", "paid_social");
      destination.searchParams.set("utm_campaign", parsed.data.campaign);
      destination.searchParams.set("utm_content", parsed.data.content);
      destination.searchParams.set("attribution", publicToken);
    }
    return NextResponse.redirect(destination, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    if (params.destinationUrl) {
      return NextResponse.redirect(destination, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    return NextResponse.json(
      { error: "広告リンクを開けませんでした" },
      { status: 500 }
    );
  }
}
