import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { COUNCIL_SEARCH_CLIENT_TIMEOUT_MS } from "../../shared/constants/council-search";
import type {
  CouncilKeywordSearchRequest,
  CouncilKeywordSearchResponse,
} from "../../shared/types/council-keyword-search";

export async function requestCouncilKeywordSearch(
  input: CouncilKeywordSearchRequest,
  signal?: AbortSignal
): Promise<CouncilKeywordSearchResponse> {
  const response = await fetchWithTimeout("/api/council-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
    timeoutMs: COUNCIL_SEARCH_CLIENT_TIMEOUT_MS,
  });
  if (!response.ok) {
    throw new Error("Council search request failed");
  }
  return (await response.json()) as CouncilKeywordSearchResponse;
}
