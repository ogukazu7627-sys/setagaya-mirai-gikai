import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { parseOpinions } from "@/features/interview-report/shared/utils/format-utils";
import {
  buildPetitionDocumentText,
  buildPetitionDocumentTitle,
} from "../shared/petition-document";

type PetitionGoogleDocsErrorCode =
  | "report_not_found"
  | "unauthorized_report"
  | "bill_not_found"
  | "google_docs_create_failed"
  | "google_docs_update_failed";

export class PetitionGoogleDocsError extends Error {
  constructor(
    message: string,
    public readonly code: PetitionGoogleDocsErrorCode
  ) {
    super(message);
    this.name = "PetitionGoogleDocsError";
  }
}

type GoogleDocsCreateResponse = {
  documentId?: string;
  title?: string;
};

async function googleDocsJson<T>(
  url: string,
  accessToken: string,
  init: Omit<RequestInit, "headers">
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Google Docs API returned ${response.status}: ${body.slice(0, 400)}`
    );
  }

  return (await response.json()) as T;
}

async function loadReportDraftData(reportId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: report, error: reportError } = await supabase
    .from("interview_report")
    .select(
      "id, summary, opinions, interview_sessions(user_id, interview_configs(bill_id))"
    )
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    throw new PetitionGoogleDocsError(
      `レポートの読み取りに失敗しました: ${reportError.message}`,
      "report_not_found"
    );
  }

  if (!report) {
    throw new PetitionGoogleDocsError(
      "レポートが見つかりません。",
      "report_not_found"
    );
  }

  const session = report.interview_sessions as {
    user_id: string;
    interview_configs: { bill_id: string } | null;
  } | null;

  if (!session || session.user_id !== userId) {
    throw new PetitionGoogleDocsError(
      "このレポートのGoogle Docs下書きは作成できません。",
      "unauthorized_report"
    );
  }

  const billId = session.interview_configs?.bill_id;
  if (!billId) {
    throw new PetitionGoogleDocsError(
      "レポートに紐づく案件が見つかりません。",
      "bill_not_found"
    );
  }

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, name, bill_contents(title, summary, difficulty_level)")
    .eq("id", billId)
    .maybeSingle();

  if (billError || !bill) {
    throw new PetitionGoogleDocsError(
      `案件の読み取りに失敗しました: ${billError?.message ?? "bill not found"}`,
      "bill_not_found"
    );
  }

  const billContents = Array.isArray(bill.bill_contents)
    ? bill.bill_contents
    : bill.bill_contents
      ? [bill.bill_contents]
      : [];
  const normalContent =
    billContents.find((content) => content.difficulty_level === "normal") ??
    billContents[0] ??
    null;

  return {
    billName: bill.name,
    billTitle: normalContent?.title ?? bill.name,
    summary: report.summary,
    opinions: parseOpinions(report.opinions),
  };
}

export async function createPetitionGoogleDocFromReport({
  reportId,
  userId,
  accessToken,
}: {
  reportId: string;
  userId: string;
  accessToken: string;
}) {
  const draftData = await loadReportDraftData(reportId, userId);
  const title = buildPetitionDocumentTitle(draftData);
  const text = buildPetitionDocumentText(draftData);

  let documentId: string | undefined;
  try {
    const document = await googleDocsJson<GoogleDocsCreateResponse>(
      "https://docs.googleapis.com/v1/documents",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      }
    );
    documentId = document.documentId;
  } catch (error) {
    throw new PetitionGoogleDocsError(
      error instanceof Error
        ? error.message
        : "Google Docs下書きの作成に失敗しました。",
      "google_docs_create_failed"
    );
  }

  if (!documentId) {
    throw new PetitionGoogleDocsError(
      "Google Docs下書きのdocumentIdを取得できませんでした。",
      "google_docs_create_failed"
    );
  }

  try {
    await googleDocsJson(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text,
              },
            },
          ],
        }),
      }
    );
  } catch (error) {
    throw new PetitionGoogleDocsError(
      error instanceof Error
        ? error.message
        : "Google Docs下書きへの書き込みに失敗しました。",
      "google_docs_update_failed"
    );
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    title,
  };
}
