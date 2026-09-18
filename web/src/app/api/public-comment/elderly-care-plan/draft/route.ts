import { generatePublicCommentDraft } from "@/features/public-comment/elderly-care-plan/server/ai";
import {
  ELDERLY_CARE_PLAN_CAMPAIGN_SLUG,
  ELDERLY_CARE_PLAN_PLAN,
  ELDERLY_CARE_PLAN_QUESTIONS,
  ELDERLY_CARE_PLAN_SOURCES,
} from "@/features/public-comment/elderly-care-plan/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: ELDERLY_CARE_PLAN_CAMPAIGN_SLUG,
  questionsLength: ELDERLY_CARE_PLAN_QUESTIONS.length,
  sources: ELDERLY_CARE_PLAN_SOURCES,
  parseTargetOrdinances: () => [ELDERLY_CARE_PLAN_PLAN],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "ElderlyCarePlan",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
