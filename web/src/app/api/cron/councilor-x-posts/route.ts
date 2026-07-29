import { syncCouncilorXPosts } from "@/features/councilor-x-posts/server/services/councilor-x-post-sync-service";
import { XApiRequestError } from "@/features/councilor-x-posts/server/services/x-api-client";
import { isCouncilorXPostSyncRequestAuthorized } from "@/features/councilor-x-posts/server/utils/councilor-x-post-sync-auth";
import { jsonResponse } from "@/lib/api/response";

export const maxDuration = 300;

const ROUTE = "/api/cron/councilor-x-posts";
const LOG_TEXT_MAX_LENGTH = 1_000;

export async function GET(request: Request): Promise<Response> {
  if (!(await isCouncilorXPostSyncRequestAuthorized(request))) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id");
  console.log(
    JSON.stringify({
      level: "info",
      msg: "Councilor X post sync started",
      route: ROUTE,
      requestId,
    })
  );

  try {
    const result = await syncCouncilorXPosts();
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Councilor X post sync completed",
        route: ROUTE,
        requestId,
        ms: Date.now() - startedAt,
        result,
      })
    );
    return jsonResponse(result, 200);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Councilor X post sync failed",
        route: ROUTE,
        requestId,
        ms: Date.now() - startedAt,
        error: toLoggableError(error),
      })
    );
    return jsonResponse({ error: "X post sync failed" }, 500);
  }
}

function toLoggableError(error: unknown): Record<string, unknown> {
  if (error instanceof XApiRequestError) {
    return removeNullish({
      name: error.name,
      message: sanitizeLogText(error.message),
      stack: sanitizeLogText(error.stack),
      cause: toLoggableCause(error.cause),
      xApi: removeNullish({
        requestLabel: error.requestLabel,
        status: error.status,
        statusText: error.statusText,
        responseBody: sanitizeLogText(error.responseBody),
      }),
    });
  }

  if (error instanceof Error) {
    return removeNullish({
      name: error.name,
      message: sanitizeLogText(error.message),
      stack: sanitizeLogText(error.stack),
      cause: toLoggableCause(error.cause),
    });
  }

  return {
    name: typeof error,
    message: sanitizeLogText(stringifyUnknown(error)),
  };
}

function toLoggableCause(cause: unknown): Record<string, unknown> | undefined {
  if (cause === undefined || cause === null) {
    return undefined;
  }
  if (cause instanceof Error) {
    return removeNullish({
      name: cause.name,
      message: sanitizeLogText(cause.message),
      stack: sanitizeLogText(cause.stack),
    });
  }
  return {
    name: typeof cause,
    message: sanitizeLogText(stringifyUnknown(cause)),
  };
}

function sanitizeLogText(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const redacted = value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]")
    .replace(/(token|secret|api[_-]?key)=([^&\s]+)/gi, "$1=[REDACTED]");

  return redacted.length > LOG_TEXT_MAX_LENGTH
    ? `${redacted.slice(0, LOG_TEXT_MAX_LENGTH)}...[truncated]`
    : redacted;
}

function stringifyUnknown(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function removeNullish<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== undefined && entry !== null
    )
  ) as T;
}
