import { ELDERLY_CARE_PLAN_CAMPAIGN_SLUG } from "@/features/public-comment/elderly-care-plan/shared/campaign";
import { createPublicCommentReceiptHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentReceiptHandler(
  ELDERLY_CARE_PLAN_CAMPAIGN_SLUG
);
