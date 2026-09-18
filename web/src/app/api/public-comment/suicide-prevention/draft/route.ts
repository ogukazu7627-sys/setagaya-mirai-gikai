import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";
import { generatePublicCommentDraft } from "@/features/public-comment/suicide-prevention/server/ai";
import {
  SUICIDE_PREVENTION_CAMPAIGN_SLUG,
  SUICIDE_PREVENTION_PLAN,
  SUICIDE_PREVENTION_QUESTIONS,
  SUICIDE_PREVENTION_SOURCES,
} from "@/features/public-comment/suicide-prevention/shared/campaign";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: SUICIDE_PREVENTION_CAMPAIGN_SLUG,
  questionsLength: SUICIDE_PREVENTION_QUESTIONS.length,
  sources: SUICIDE_PREVENTION_SOURCES,
  parseTargetOrdinances: () => [SUICIDE_PREVENTION_PLAN],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "SuicidePrevention",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
