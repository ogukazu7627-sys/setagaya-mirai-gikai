import { MINPAKU_CAMPAIGN_SLUG } from "@/features/public-comment/minpaku/shared/campaign";
import { createPublicCommentEventInvitationHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentEventInvitationHandler(
  MINPAKU_CAMPAIGN_SLUG
);
