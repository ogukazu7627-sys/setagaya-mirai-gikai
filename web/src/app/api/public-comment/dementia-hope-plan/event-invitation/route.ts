import { DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG } from "@/features/public-comment/dementia-hope-plan/shared/campaign";
import { createPublicCommentEventInvitationHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentEventInvitationHandler(
  DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG
);
