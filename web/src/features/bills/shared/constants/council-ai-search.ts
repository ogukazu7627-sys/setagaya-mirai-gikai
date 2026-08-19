export const COUNCIL_SEARCH_EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const COUNCIL_SEARCH_EMBEDDING_DIMENSIONS = 512;
export const COUNCIL_SEARCH_INDEX_VERSION = 1;
export const COUNCIL_SEARCH_MAX_RESULTS = 50;
export const COUNCIL_SEARCH_SIMILARITY_THRESHOLD = 0.4;
/**
 * Embedding が詰まったときに待ち続けないための上限。
 * 超えた場合はキーワード検索へ縮退するので、短めに倒す。
 */
export const COUNCIL_SEARCH_EMBEDDING_TIMEOUT_MS = 5_000;
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
