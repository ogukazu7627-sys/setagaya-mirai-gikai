import type {
  StoredRecommendationProfile,
  TodayRecommendationsResponse,
} from "../../shared/types/recommendation";

export class RecommendationClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = "RecommendationClientError";
  }
}

export async function savePreferences(input: {
  installationId: string;
  selectedSmallTags: string[];
  timezone: string;
}) {
  return requestJson<{
    selectedSmallTags: StoredRecommendationProfile["selectedSmallTags"];
    selectedParentCategoryIds: StoredRecommendationProfile["selectedParentCategoryIds"];
    preferenceVersion: number;
  }>("/api/recommendations/preferences", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function fetchTodayRecommendations(
  installationId: string
): Promise<TodayRecommendationsResponse> {
  return requestJson<TodayRecommendationsResponse>(
    "/api/recommendations/today",
    {
      method: "POST",
      body: JSON.stringify({ installationId }),
    }
  );
}

export async function resetRecommendationHistory(installationId: string) {
  return requestJson<{ preferenceVersion: number }>(
    "/api/recommendations/reset-history",
    {
      method: "POST",
      body: JSON.stringify({ installationId }),
    }
  );
}

export async function deleteRecommendationData(installationId: string) {
  return requestJson<{ success: boolean }>("/api/recommendations/profile", {
    method: "DELETE",
    body: JSON.stringify({ installationId }),
  });
}

export function recordRecommendationImpressions(
  installationId: string,
  billIds: string[]
) {
  return requestJson<{ success: boolean }>("/api/recommendations/impressions", {
    method: "POST",
    body: JSON.stringify({
      installationId,
      billIds,
      source: "homepage",
    }),
    keepalive: true,
  });
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;

  if (!response.ok) {
    throw new RecommendationClientError(
      body?.error ?? "おすすめ機能を利用できません",
      body?.code ?? "unknown",
      response.status
    );
  }
  return body as T;
}
