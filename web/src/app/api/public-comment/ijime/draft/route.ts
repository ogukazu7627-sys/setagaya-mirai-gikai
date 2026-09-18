import { generatePublicCommentDraft } from "@/features/public-comment/ijime/server/ai";
import {
  IJIME_CAMPAIGN_SLUG,
  IJIME_ORDINANCE,
  IJIME_QUESTIONS,
  IJIME_SOURCES,
} from "@/features/public-comment/ijime/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: IJIME_CAMPAIGN_SLUG,
  questionsLength: IJIME_QUESTIONS.length,
  sources: IJIME_SOURCES,
  parseTargetOrdinances: () => [IJIME_ORDINANCE],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "Ijime",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
