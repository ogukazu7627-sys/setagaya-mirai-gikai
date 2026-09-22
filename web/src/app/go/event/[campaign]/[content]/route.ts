import { YOUTH_DIALOGUE_DIRECT_RSVP_URL } from "@/features/public-comment/shared/funnel";
import { createPaidSocialRedirect } from "@/features/public-comment/shared/server/paid-social-redirect";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaign: string; content: string }> }
) {
  const { campaign, content } = await params;
  return createPaidSocialRedirect({
    request,
    campaign,
    content,
    journeyType: "event_direct",
    adTheme: "event-direct",
    landingPath: "/external/google-form/event-direct",
    destinationUrl: YOUTH_DIALOGUE_DIRECT_RSVP_URL,
  });
}
