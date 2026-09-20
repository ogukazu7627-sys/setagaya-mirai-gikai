import { createPublicCommentEventInvitationHandler } from "@/features/public-comment/shared/server/receipt-routes";
import { TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG } from "@/features/public-comment/traffic-safety-plan/shared/campaign";

export const maxDuration = 30;
export const POST = createPublicCommentEventInvitationHandler(
  TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG
);
