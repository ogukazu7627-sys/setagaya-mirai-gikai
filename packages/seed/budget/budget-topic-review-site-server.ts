import fs from "node:fs";
import http, {
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BudgetTopicReviewConflictError,
  BudgetTopicReviewInputError,
  type BudgetTopicReviewSiteOptions,
  type BudgetTopicReviewSiteSnapshot,
  readBudgetTopicReviewSiteSnapshot,
  saveBudgetTopicReviewSiteChanges,
} from "./budget-topic-review-site";

const MAX_REQUEST_BODY_BYTES = 1_000_000;
const STATIC_ASSETS = new Map([
  ["/", { fileName: "index.html", contentType: "text/html; charset=utf-8" }],
  [
    "/index.html",
    { fileName: "index.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/styles.css",
    { fileName: "styles.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/app.js",
    { fileName: "app.js", contentType: "text/javascript; charset=utf-8" },
  ],
]);

const SECURITY_HEADERS = {
  "cache-control": "no-store",
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'none'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

export interface BudgetTopicReviewServerOptions
  extends BudgetTopicReviewSiteOptions {
  assetDirectory?: string;
  onError?: (error: unknown) => void;
}

export interface StartedBudgetTopicReviewServer {
  server: Server;
  url: string;
  snapshot: BudgetTopicReviewSiteSnapshot;
  close: () => Promise<void>;
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown
): void {
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function sendEmpty(response: ServerResponse, statusCode: number): void {
  response.writeHead(statusCode, SECURITY_HEADERS);
  response.end();
}

function getListeningPort(server: Server): number | undefined {
  const address = server.address();
  return address && typeof address === "object" ? address.port : undefined;
}

function isAllowedLocalUrl(value: string, expectedPort: number): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      url.username === "" &&
      url.password === "" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      Number(url.port || 80) === expectedPort
    );
  } catch {
    return false;
  }
}

function isAllowedHost(
  request: IncomingMessage,
  expectedPort: number
): boolean {
  const host = request.headers.host;
  return host ? isAllowedLocalUrl(`http://${host}`, expectedPort) : false;
}

function hasAllowedMutationOrigin(
  request: IncomingMessage,
  expectedPort: number
): boolean {
  const origin = request.headers.origin;
  return typeof origin === "string" && isAllowedLocalUrl(origin, expectedPort);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new BudgetTopicReviewInputError(
      "Content-Typeはapplication/jsonにしてください"
    );
  }

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BODY_BYTES
  ) {
    throw new BudgetTopicReviewInputError("保存内容が大きすぎます");
  }

  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > MAX_REQUEST_BODY_BYTES) {
      throw new BudgetTopicReviewInputError("保存内容が大きすぎます");
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BudgetTopicReviewInputError("保存内容がJSONではありません");
  }
}

function getDefaultAssetDirectory(): string {
  return fileURLToPath(new URL("./topic-review-site", import.meta.url));
}

function serveStaticAsset(
  response: ServerResponse,
  pathname: string,
  assetDirectory: string,
  headOnly = false
): boolean {
  const asset = STATIC_ASSETS.get(pathname);
  if (!asset) {
    return false;
  }
  const body = fs.readFileSync(path.join(assetDirectory, asset.fileName));
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    "content-type": asset.contentType,
  });
  response.end(headOnly ? undefined : body);
  return true;
}

export function createBudgetTopicReviewServer(
  options: BudgetTopicReviewServerOptions
): Server {
  const assetDirectory = options.assetDirectory ?? getDefaultAssetDirectory();
  let server: Server;
  let mutationInProgress = false;

  server = http.createServer(async (request, response) => {
    try {
      const port = getListeningPort(server);
      if (!port || !isAllowedHost(request, port)) {
        sendJson(response, 403, {
          error: "ローカルアクセスだけを許可しています",
        });
        return;
      }
      const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

      if (request.method === "GET" && url.pathname === "/api/review") {
        sendJson(response, 200, readBudgetTopicReviewSiteSnapshot(options));
        return;
      }
      if (request.method === "PUT" && url.pathname === "/api/review") {
        if (!hasAllowedMutationOrigin(request, port)) {
          sendJson(response, 403, { error: "保存元を確認できません" });
          return;
        }
        if (mutationInProgress) {
          sendJson(response, 409, {
            error: "別の保存処理が進行中です。完了後に再読込してください",
          });
          return;
        }
        mutationInProgress = true;
        try {
          const body = await readJsonBody(request);
          sendJson(
            response,
            200,
            saveBudgetTopicReviewSiteChanges(options, body)
          );
        } finally {
          mutationInProgress = false;
        }
        return;
      }
      if (request.method === "GET" || request.method === "HEAD") {
        if (
          serveStaticAsset(
            response,
            url.pathname,
            assetDirectory,
            request.method === "HEAD"
          )
        ) {
          return;
        }
        sendJson(response, 404, { error: "見つかりません" });
        return;
      }
      if (request.method === "OPTIONS") {
        sendEmpty(response, 405);
        return;
      }
      sendJson(response, 405, { error: "許可されていない操作です" });
    } catch (error) {
      options.onError?.(error);
      if (error instanceof BudgetTopicReviewConflictError) {
        sendJson(response, 409, { error: error.message });
        return;
      }
      if (error instanceof BudgetTopicReviewInputError) {
        sendJson(response, 400, { error: error.message });
        return;
      }
      sendJson(response, 500, {
        error: "レビュー画面で処理できないエラーが発生しました",
      });
    }
  });
  return server;
}

export async function startBudgetTopicReviewServer(
  options: BudgetTopicReviewServerOptions,
  port = 4311
): Promise<StartedBudgetTopicReviewServer> {
  const snapshot = readBudgetTopicReviewSiteSnapshot(options);
  const server = createBudgetTopicReviewServer(options);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const listeningPort = getListeningPort(server);
  if (!listeningPort) {
    server.close();
    throw new Error("レビュー画面のポートを取得できませんでした");
  }
  return {
    server,
    url: `http://127.0.0.1:${listeningPort}`,
    snapshot,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
