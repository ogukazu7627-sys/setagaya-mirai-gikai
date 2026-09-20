import { IJIME_CAMPAIGN_SLUG } from "@/features/public-comment/ijime/shared/campaign";
import { createPublicCommentEventInvitationHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST =
  createPublicCommentEventInvitationHandler(IJIME_CAMPAIGN_SLUG);
