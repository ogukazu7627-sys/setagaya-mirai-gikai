import type { ReportRecipientSelection } from "@/features/councilor-digest/shared/types";

interface CompleteInterviewParams {
  sessionId: string;
  isPublic: boolean;
  includeRecipientSelection?: boolean;
}

export interface CompleteInterviewResult {
  report?: {
    id: string;
  };
  recipientSelection?: ReportRecipientSelection | null;
}

export interface RecipientCandidatesResult {
  recipientSelection: ReportRecipientSelection;
}

export interface UpdatePublicSettingResult {
  success: boolean;
  error?: string;
}

/**
 * インタビュー完了APIを呼び出して、レポートをDBに保存
 */
export async function callCompleteApi(
  params: CompleteInterviewParams
): Promise<CompleteInterviewResult> {
  const res = await fetch("/api/interview/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to complete interview");
  }

  return (await res.json()) as CompleteInterviewResult;
}

export async function callRecipientCandidatesApi(params: {
  sessionId: string;
}): Promise<RecipientCandidatesResult> {
  const res = await fetch("/api/interview/recipient-candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load recipient candidates");
  }

  return (await res.json()) as RecipientCandidatesResult;
}

export async function callUpdatePublicSettingApi(params: {
  sessionId: string;
  isPublic: boolean;
}): Promise<UpdatePublicSettingResult> {
  const res = await fetch("/api/interview/public-setting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await res
    .json()
    .catch(() => ({}))) as UpdatePublicSettingResult;
  if (!res.ok) {
    return {
      success: false,
      error: data.error || "公開設定の更新に失敗しました。",
    };
  }

  return data;
}
