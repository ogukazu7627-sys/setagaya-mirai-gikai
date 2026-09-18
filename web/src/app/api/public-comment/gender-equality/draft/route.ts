import { generatePublicCommentDraft } from "@/features/public-comment/gender-equality/server/ai";
import {
  GENDER_EQUALITY_CAMPAIGN_SLUG,
  GENDER_EQUALITY_PLAN,
  GENDER_EQUALITY_QUESTIONS,
  GENDER_EQUALITY_SOURCES,
} from "@/features/public-comment/gender-equality/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: GENDER_EQUALITY_CAMPAIGN_SLUG,
  questionsLength: GENDER_EQUALITY_QUESTIONS.length,
  sources: GENDER_EQUALITY_SOURCES,
  parseTargetOrdinances: () => [GENDER_EQUALITY_PLAN],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "GenderEquality",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
