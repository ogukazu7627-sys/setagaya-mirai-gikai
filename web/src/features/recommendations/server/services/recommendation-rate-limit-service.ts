import "server-only";

import { createHmac } from "node:crypto";
import { createAdminClient } from "@mirai-gikai/supabase";

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
  const windowStart = new Date(
    Math.floor(Date.now() / config.windowMs) * config.windowMs
  ).toISOString();
  const ip = getRequestIp(input.request);
  const [installationAllowed, ipAllowed] = await Promise.all([
    consume({
      keyHash: hashRateLimitKey(
        `installation:${input.installationId}:${windowStart}`
      ),
      routeKey: input.routeKey,
      windowStart,
      limit: config.installationLimit,
    }),
    consume({
      keyHash: hashRateLimitKey(`ip:${ip}:${windowStart}`),
      routeKey: input.routeKey,
      windowStart,
      limit: config.installationLimit * 5,
    }),
  ]);
  return installationAllowed && ipAllowed;
}

async function consume(input: {
  keyHash: string;
  routeKey: string;
  windowStart: string;
  limit: number;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "consume_recommendation_rate_limit",
    {
      p_key_hash: input.keyHash,
      p_route_key: input.routeKey,
      p_window_start: input.windowStart,
      p_limit: input.limit,
    }
  );
  if (error) {
    throw new Error(`Failed to consume recommendation rate limit`);
  }
  return data;
}

function hashRateLimitKey(value: string): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_SECRET is required");
  }
  return createHmac(
    "sha256",
    secret ?? "local-recommendation-rate-limit-secret"
  )
    .update(value)
    .digest("hex");
}

function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
