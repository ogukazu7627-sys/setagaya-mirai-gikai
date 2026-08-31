import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { COUNCIL_SEARCH_CLIENT_TIMEOUT_MS } from "../../shared/constants/council-search";
import type {
  CouncilBillCardPage,
  CouncilBillPageRequest,
} from "../../shared/types/council-bill-directory";

export async function requestCouncilBillPage(
  input: CouncilBillPageRequest,
  signal?: AbortSignal
): Promise<CouncilBillCardPage> {
  const response = await fetchWithTimeout("/api/council-bills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
    timeoutMs: COUNCIL_SEARCH_CLIENT_TIMEOUT_MS,
  });
  if (!response.ok) {
    throw new Error("Council bill page request failed");
  }
  return (await response.json()) as CouncilBillCardPage;
}
