import { GENDER_EQUALITY_CAMPAIGN_SLUG } from "@/features/public-comment/gender-equality/shared/campaign";
import { createPublicCommentReceiptHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentReceiptHandler(
  GENDER_EQUALITY_CAMPAIGN_SLUG
);
