/** クライアントが検索結果を待つ上限。超えたらエラー表示へ切り替える。 */
export const COUNCIL_SEARCH_CLIENT_TIMEOUT_MS = 15_000;
export const COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  installationLimit: 30,
  ipLimit: 150,
} as const;
export const COUNCIL_BILLS_ANONYMOUS_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  installationLimit: 120,
  ipLimit: 600,
} as const;
