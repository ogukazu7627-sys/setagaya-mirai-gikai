import "server-only";

import { consumeAnonymousRateLimit } from "@/lib/api/anonymous-rate-limit";

export const RECOMMENDATION_RATE_LIMITS = {
  today: { windowMs: 10 * 60 * 1000, installationLimit: 60 },
  mutation: { windowMs: 60 * 60 * 1000, installationLimit: 10 },
  impressions: { windowMs: 60 * 60 * 1000, installationLimit: 120 },
} as const;

type RateLimitKind = keyof typeof RECOMMENDATION_RATE_LIMITS;

export async function consumeRecommendationRateLimit(input: {
  request: Request;
  installationId: string;
  routeKey: string;
  kind: RateLimitKind;
}): Promise<boolean> {
  const config = RECOMMENDATION_RATE_LIMITS[input.kind];
  return consumeAnonymousRateLimit({
    request: input.request,
    installationId: input.installationId,
    routeKey: input.routeKey,
    windowMs: config.windowMs,
    installationLimit: config.installationLimit,
  });
}
