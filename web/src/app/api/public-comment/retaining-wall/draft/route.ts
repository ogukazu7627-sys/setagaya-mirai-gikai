import { generatePublicCommentDraft } from "@/features/public-comment/retaining-wall/server/ai";
import {
  RETAINING_WALL_CAMPAIGN_SLUG,
  RETAINING_WALL_POLICY,
  RETAINING_WALL_QUESTIONS,
  RETAINING_WALL_SOURCES,
} from "@/features/public-comment/retaining-wall/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: RETAINING_WALL_CAMPAIGN_SLUG,
  questionsLength: RETAINING_WALL_QUESTIONS.length,
  sources: RETAINING_WALL_SOURCES,
  parseTargetOrdinances: () => [RETAINING_WALL_POLICY],
  generate: ({ userId, sessionId, messages }) =>
    generatePublicCommentDraft({ userId, sessionId, messages }),
  logLabel: "RetainingWall",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
