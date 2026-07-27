export const COUNCIL_SEARCH_EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const COUNCIL_SEARCH_EMBEDDING_DIMENSIONS = 512;
export const COUNCIL_SEARCH_INDEX_VERSION = 1;
export const COUNCIL_SEARCH_MAX_RESULTS = 50;
export const COUNCIL_SEARCH_SIMILARITY_THRESHOLD = 0.4;
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
