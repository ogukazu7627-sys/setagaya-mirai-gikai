import type { ZodType } from "zod";

export const MAX_PUBLIC_API_BODY_BYTES = 16 * 1024;

export class PublicApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = "PublicApiRequestError";
  }
}

export async function parseBoundedJson<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_PUBLIC_API_BODY_BYTES
  ) {
    throw new PublicApiRequestError(
      "リクエストが大きすぎます",
      413,
      "payload-too-large"
    );
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_PUBLIC_API_BODY_BYTES) {
    throw new PublicApiRequestError(
      "リクエストが大きすぎます",
      413,
      "payload-too-large"
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PublicApiRequestError(
      "JSON形式を確認してください",
      400,
      "invalid-json"
    );
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new PublicApiRequestError(
      "入力内容を確認してください",
      400,
      "invalid-input"
    );
  }
  return result.data;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    throw new PublicApiRequestError(
      "リクエスト元を確認できません",
      403,
      "origin-mismatch"
    );
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    throw new PublicApiRequestError(
      "リクエスト元を確認できません",
      403,
      "origin-mismatch"
    );
  }

  if (origin !== expectedOrigin) {
    throw new PublicApiRequestError(
      "このリクエスト元は許可されていません",
      403,
      "origin-mismatch"
    );
  }
}
