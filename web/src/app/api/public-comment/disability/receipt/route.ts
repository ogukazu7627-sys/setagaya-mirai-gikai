import { DISABILITY_CAMPAIGN_SLUG } from "@/features/public-comment/disability/shared/campaign";
import { createPublicCommentReceiptHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentReceiptHandler(DISABILITY_CAMPAIGN_SLUG);
