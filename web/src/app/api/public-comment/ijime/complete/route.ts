import { IJIME_CAMPAIGN_SLUG } from "@/features/public-comment/ijime/shared/campaign";
import { createPublicCommentCompleteHandler } from "@/features/public-comment/shared/server/receipt-routes";

export const maxDuration = 30;
export const POST = createPublicCommentCompleteHandler(IJIME_CAMPAIGN_SLUG);
