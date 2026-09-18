import { generatePublicCommentDraft } from "@/features/public-comment/disability/server/ai";
import {
  DISABILITY_CAMPAIGN_SLUG,
  DISABILITY_ORDINANCE,
  DISABILITY_QUESTIONS,
  DISABILITY_SOURCES,
} from "@/features/public-comment/disability/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: DISABILITY_CAMPAIGN_SLUG,
  questionsLength: DISABILITY_QUESTIONS.length,
  sources: DISABILITY_SOURCES,
  parseTargetOrdinances: () => [DISABILITY_ORDINANCE],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "Disability",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
