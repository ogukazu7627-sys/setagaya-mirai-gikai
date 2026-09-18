import { DISABILITY_CAMPAIGN_SLUG } from "@/features/public-comment/disability/shared/campaign";
import { createPublicCommentCompleteHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentCompleteHandler(
  DISABILITY_CAMPAIGN_SLUG
);
