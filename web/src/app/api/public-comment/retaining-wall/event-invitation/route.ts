import { RETAINING_WALL_CAMPAIGN_SLUG } from "@/features/public-comment/retaining-wall/shared/campaign";
import { createPublicCommentEventInvitationHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentEventInvitationHandler(
  RETAINING_WALL_CAMPAIGN_SLUG
);
