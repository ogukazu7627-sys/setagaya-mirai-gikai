import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";
import { generatePublicCommentDraft } from "@/features/public-comment/traffic-safety-plan/server/ai";
import {
  TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG,
  TRAFFIC_SAFETY_PLAN_PLAN,
  TRAFFIC_SAFETY_PLAN_QUESTIONS,
  TRAFFIC_SAFETY_PLAN_SOURCES,
} from "@/features/public-comment/traffic-safety-plan/shared/campaign";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG,
  questionsLength: TRAFFIC_SAFETY_PLAN_QUESTIONS.length,
  sources: TRAFFIC_SAFETY_PLAN_SOURCES,
  parseTargetOrdinances: () => [TRAFFIC_SAFETY_PLAN_PLAN],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "TrafficSafetyPlan",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
