import { createPublicCommentReceiptHandler } from "@/features/public-comment/shared/server/receipt-routes";
import { SUICIDE_PREVENTION_CAMPAIGN_SLUG } from "@/features/public-comment/suicide-prevention/shared/campaign";

export const maxDuration = 30;
export const POST = createPublicCommentReceiptHandler(
  SUICIDE_PREVENTION_CAMPAIGN_SLUG
);
