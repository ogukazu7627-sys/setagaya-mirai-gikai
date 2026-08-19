import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { COUNCIL_SEARCH_CLIENT_TIMEOUT_MS } from "../../shared/constants/council-ai-search";
import type {
  CouncilAiSearchRequest,
  CouncilAiSearchResponse,
} from "../../shared/types/council-ai-search";

export async function requestCouncilAiSearch(
  input: CouncilAiSearchRequest,
  signal?: AbortSignal
): Promise<CouncilAiSearchResponse> {
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
  return (await response.json()) as CouncilAiSearchResponse;
}
