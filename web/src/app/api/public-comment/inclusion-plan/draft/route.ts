import { generatePublicCommentDraft } from "@/features/public-comment/inclusion-plan/server/ai";
import {
  INCLUSION_PLAN_CAMPAIGN_SLUG,
  INCLUSION_PLAN_PLAN,
  INCLUSION_PLAN_QUESTIONS,
  INCLUSION_PLAN_SOURCES,
} from "@/features/public-comment/inclusion-plan/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: INCLUSION_PLAN_CAMPAIGN_SLUG,
  questionsLength: INCLUSION_PLAN_QUESTIONS.length,
  sources: INCLUSION_PLAN_SOURCES,
  parseTargetOrdinances: () => [INCLUSION_PLAN_PLAN],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "InclusionPlan",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
