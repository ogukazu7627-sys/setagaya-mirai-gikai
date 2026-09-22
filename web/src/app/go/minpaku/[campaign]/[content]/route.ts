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
    journeyType: "interview",
    adTheme: "minpaku-2026",
    landingPath: "/public-comment/minpaku",
  });
}
