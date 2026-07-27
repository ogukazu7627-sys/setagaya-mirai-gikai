import type {
  CouncilBillCardPage,
  CouncilBillPageRequest,
} from "../../shared/types/council-bill-directory";

export async function requestCouncilBillPage(
  input: CouncilBillPageRequest,
  signal?: AbortSignal
): Promise<CouncilBillCardPage> {
  const response = await fetch("/api/council-bills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) {
    throw new Error("Council bill page request failed");
  }
  return (await response.json()) as CouncilBillCardPage;
}
