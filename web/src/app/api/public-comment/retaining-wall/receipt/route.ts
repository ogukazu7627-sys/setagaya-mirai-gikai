import { RETAINING_WALL_CAMPAIGN_SLUG } from "@/features/public-comment/retaining-wall/shared/campaign";
import { createPublicCommentReceiptHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentReceiptHandler(
  RETAINING_WALL_CAMPAIGN_SLUG
);
