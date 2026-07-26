import type {
  CouncilAiSearchRequest,
  CouncilAiSearchResponse,
} from "../../shared/types/council-ai-search";

export async function requestCouncilAiSearch(
  input: CouncilAiSearchRequest,
  signal?: AbortSignal
): Promise<CouncilAiSearchResponse> {
  const response = await fetch("/api/council-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) {
    throw new Error("Council search request failed");
  }
  return (await response.json()) as CouncilAiSearchResponse;
}
