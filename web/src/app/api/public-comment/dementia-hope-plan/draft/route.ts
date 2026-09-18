import { generatePublicCommentDraft } from "@/features/public-comment/dementia-hope-plan/server/ai";
import {
  DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG,
  DEMENTIA_HOPE_PLAN_PLAN,
  DEMENTIA_HOPE_PLAN_QUESTIONS,
  DEMENTIA_HOPE_PLAN_SOURCES,
} from "@/features/public-comment/dementia-hope-plan/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG,
  questionsLength: DEMENTIA_HOPE_PLAN_QUESTIONS.length,
  sources: DEMENTIA_HOPE_PLAN_SOURCES,
  parseTargetOrdinances: () => [DEMENTIA_HOPE_PLAN_PLAN],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "DementiaHopePlan",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
