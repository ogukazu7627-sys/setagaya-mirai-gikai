import { createHash } from "node:crypto";
import {
  COUNCIL_SEARCH_EMBEDDING_DIMENSIONS,
  COUNCIL_SEARCH_EMBEDDING_MODEL,
  COUNCIL_SEARCH_INDEX_VERSION,
} from "../../shared/constants/council-search-index";

export function createCouncilSearchContentHash(content: string): string {
  return createHash("sha256")
    .update(
      [
        String(COUNCIL_SEARCH_INDEX_VERSION),
        COUNCIL_SEARCH_EMBEDDING_MODEL,
        String(COUNCIL_SEARCH_EMBEDDING_DIMENSIONS),
        content,
      ].join("\0")
    )
    .digest("hex");
}

export function formatPostgresVector(values: number[]): string {
  if (values.length !== COUNCIL_SEARCH_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${COUNCIL_SEARCH_EMBEDDING_DIMENSIONS} embedding dimensions`
    );
  }
  if (!values.every(Number.isFinite)) {
    throw new Error("Embedding contains a non-finite value");
  }
  return `[${values.join(",")}]`;
}
