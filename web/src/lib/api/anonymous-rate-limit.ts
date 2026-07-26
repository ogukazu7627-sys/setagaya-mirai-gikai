import "server-only";

import { createHmac } from "node:crypto";
import { createAdminClient } from "@mirai-gikai/supabase";

export async function consumeAnonymousRateLimit(input: {
  request: Request;
  installationId: string;
  routeKey: string;
  windowMs: number;
  installationLimit: number;
  ipLimit?: number;
}): Promise<boolean> {
  const windowStart = new Date(
    Math.floor(Date.now() / input.windowMs) * input.windowMs
  ).toISOString();
  const ip = getRequestIp(input.request);
  const [installationAllowed, ipAllowed] = await Promise.all([
    consume({
      keyHash: hashRateLimitKey(
        `installation:${input.installationId}:${windowStart}`
      ),
      routeKey: input.routeKey,
      windowStart,
      limit: input.installationLimit,
    }),
    consume({
      keyHash: hashRateLimitKey(`ip:${ip}:${windowStart}`),
      routeKey: input.routeKey,
      windowStart,
      limit: input.ipLimit ?? input.installationLimit * 5,
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
    throw new Error("Failed to consume anonymous rate limit");
  }
  return data;
}

function hashRateLimitKey(value: string): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_SECRET is required");
  }
  return createHmac("sha256", secret ?? "local-anonymous-rate-limit-secret")
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
