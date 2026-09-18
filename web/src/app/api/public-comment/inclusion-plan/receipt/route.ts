import { INCLUSION_PLAN_CAMPAIGN_SLUG } from "@/features/public-comment/inclusion-plan/shared/campaign";
import { createPublicCommentReceiptHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentReceiptHandler(
  INCLUSION_PLAN_CAMPAIGN_SLUG
);
