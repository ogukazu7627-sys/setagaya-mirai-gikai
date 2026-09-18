import { generatePublicCommentDraft } from "@/features/public-comment/minpaku/server/ai";
import {
  MINPAKU_CAMPAIGN_SLUG,
  MINPAKU_ORDINANCES,
  MINPAKU_QUESTIONS,
  MINPAKU_SOURCES,
} from "@/features/public-comment/minpaku/shared/campaign";
import { createPublicCommentDraftRoutes } from "@/features/public-comment/shared/server/draft-routes";

export const maxDuration = 60;

function parseTargetOrdinances(body: unknown) {
  const value =
    body && typeof body === "object" && "targetOrdinances" in body
      ? body.targetOrdinances
      : null;
  if (!Array.isArray(value) || value.length === 0 || value.length > 2)
    return null;
  const ordinances = value.filter(
    (item): item is string =>
      typeof item === "string" &&
      MINPAKU_ORDINANCES.includes(item as (typeof MINPAKU_ORDINANCES)[number])
  );
  return ordinances.length === value.length ? ordinances : null;
}

const handlers = createPublicCommentDraftRoutes({
  campaignSlug: MINPAKU_CAMPAIGN_SLUG,
  questionsLength: MINPAKU_QUESTIONS.length,
  sources: MINPAKU_SOURCES,
  parseTargetOrdinances,
  generate: ({ userId, sessionId, messages, targetOrdinances }) =>
    generatePublicCommentDraft({
      userId,
      sessionId,
      messages,
      targetOrdinances,
    }),
  logLabel: "Minpaku",
});

export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
